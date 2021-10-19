#!/usr/bin/env zx

$.verbose = false

const testLoggedInToAzCli = async () => {
	const output = await $`az account list -o tsv`
	
	if (output.toString().includes('az login')) {
		return false
	}
	return true
}


if (argv.h || Object.keys(argv).includes('help')) {
	console.log(`
 ⚡ Create Terraform State Storage 
    
	Usage:
	  -g <resourceGroup> -l <location> -n <storageName> -c <containerName>

    Args:
	  --resource-group -g     [Required] Name of the resource group
	  --location -l           [Required] Location of the Storage Account
	  --container -c          [Required] Storage Container
	  --name -n               [Required] Storage Name
	  --sku                   SKU of the storage account (Defaults to Standard_LRS)
	  --help -h               Help: This help message
	`)
}

const argGet = (argvObj, argNames) => argNames.reduce((prev, curr) => {
	return prev || argvObj[curr]
}, undefined)

const checkArguments = async (argvObj) => {
	if (!argGet(argvObj, ['name', 'n', 'container', 'c', 'resource-group', 'g', 'location', 'l'])) {
		console.log(chalk.bgRed('❗ Error: You need to add both the storage account name and container name'))
		console.log(chalk.bgRed('❗ Run the command --help to see the full Help Message '))
		await $`exit 1`
	}
}


if (!argv.h && !Object.keys(argv).includes('help')) {
	await checkArguments(argv)

	const loggedIn = await testLoggedInToAzCli()

	if (!loggedIn) {
		console.log(chalk.bgRed('❗ Error: You are not signed in. '))
		console.log(chalk.bgRed('❗ Please Log in first by running "az login --use-device-code" '))
		await $`exit 1`
	}

	const subInfoRaw = await $`az account show`
	const subInfo = JSON.parse(subInfoRaw)

	const proceed = (await question(chalk.bgYellow.black(`
 ❓ Continue with this subscription? [Y/n]
`) + `${subInfo.name} (${subInfo.id})
`)).toLowerCase() || 'y'

	if (proceed !== 'y' && proceed !== 'yes') {
		console.log('⛔ Exited: You chose not to continue. ')
		console.log('⛔ Please Run "az account set -s <subcription-id>" to set the target subscription')
		await $`exit 1`
	}

	/**
	 * Gather information
	 */
	const storageName = argGet(argv, ['name', 'n'])
	const containerName = argGet(argv, ['container', 'c'])
	const resourceGroup = argGet(argv, ['resource-group', 'g'])
	const location = argGet(argv, ['location', 'l'])
	const sku = argGet(argv, ['sku']) || 'Standard_LRS'
	
	/**
	 * Check or Create Resource Group
	 */
	const existingRgs = await $`az group list`
	const rgAlreadyExists = JSON.parse(existingRgs).find(_ => _.name === resourceGroup)
	
	if (rgAlreadyExists) {
		console.log(chalk.green('✔ Resource Group Already Exists'))
	} else {
		console.log(`Creating Resource Group: ${resourceGroup}`)
		await $`az group create -l ${location} -n ${resourceGroup}`
		console.log(chalk.green(`✔ Finished Creating Resource Group`))
	}
	
	/**
	 * Check or Create Storage Account
	 */
	const existingAccounts = await $`az storage account list -g ${resourceGroup}`
	const storageAlreadyExists = JSON.parse(existingAccounts).find(_ => _.name === storageName)
	
	if (storageAlreadyExists) {
		console.log(chalk.green('✔ Storage Account Already Exists'))
	} else {
		const validResponse = JSON.parse(await $`az storage account check-name -n ${storageName}`)
		if (!validResponse.nameAvailable) {
			console.log(chalk.bgRed('❗ Error: Something is wrong with the storage Name '))
			console.log(chalk.bgRed(`❗ Reason: ${validResponse.message} `))
			await $`exit 1`
		}
		console.log('Creating Storage Account...')
		await $`az storage account create -n ${storageName} -g ${resourceGroup} -l ${location} --sku ${sku} --encryption-services blob`
		console.log(chalk.green(`✔ Finished Creating Storage Account`))
	}

	/**
	 * Check or Create Storage Account Container
	 */
	const accessKey = JSON.parse(await $`az storage account keys list -n ${storageName}`)[0].value
	const existingContainers = await $`az storage container list --account-name ${storageName} --account-key ${accessKey}`
	const containerAlreadyExists = JSON.parse(existingContainers).find(_ => _.name === containerName)

	if (containerAlreadyExists) {
		console.log(chalk.green('✔ Container Already Exists'))
	} else {
		console.log('Creating Container in Storage Account...')
		await $`az storage container create -n ${containerName} --account-name ${storageName} --account-key ${accessKey}` 
		console.log(chalk.green(`✔ Finished Creating Container`))
	}

	/**
	 * Generate Command Line
	 */
	const dirTf = await question('Which Terraform config directory would you like to init? \n')
	const command = `terraform init -backend-config="resource_group_name=${resourceGroup}" -backend-config="storage_account_name=${storageName}" -backend-config="container_name=${containerName}" -backend-config="key=terraform.tfstate"`
	console.log(`Ready to Run the command to initialize terraform:`)
	console.log(command)
	const runCommand = (await question('Continue? [Y/n]')).toLowerCase() || 'y'
	if (runCommand === 'y' || runCommand === 'yes') {
		console.log('Initializing Terraform')
		$.verbose = true
		await cd(`terraform/${dirTf}`)
		await $`terraform init -backend-config="resource_group_name=${resourceGroup}" -backend-config="storage_account_name=${storageName}" -backend-config="container_name=${containerName}" -backend-config="key=terraform.tfstate"`
		console.log(chalk.green('✔ Terraform Initialized with Azure Backend'))
	} else {
		console.log('No problem, feel free to copy and running the command yourself in the terraform directory.')
	}

}
