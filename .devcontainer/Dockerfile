# [Choice] Node.js version (use -bullseye variants on local arm64/Apple Silicon): 16, 14, 12, 16-bullseye, 14-bullseye, 12-bullseye, 16-buster, 14-buster, 12-buster
ARG VARIANT=16-bullseye
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:${VARIANT}

# [Option] Install zsh
ARG INSTALL_ZSH="true"
# [Option] Upgrade OS packages to their latest versions
ARG UPGRADE_PACKAGES="false"

ARG TERRAFORM_VERSION=1.0.8
ARG OCTANT_VERSION=0.24.0
ARG KUBECTL_VERSION=v1.22.2

# Install needed packages and setup non-root user. Use a separate RUN statement to add your own dependencies.
COPY library-scripts/*.sh /tmp/library-scripts/
RUN bash /tmp/library-scripts/azcli-debian.sh \
    # Clean up
    && apt-get clean -y && rm -rf /var/lib/apt/lists/* /tmp/library-scripts

# [Optional] Uncomment this section to install additional OS packages.
# RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
#     && apt-get -y install --no-install-recommends <your-package-list-here>

#####################
# Install Terraform
#####################
RUN wget --progress=dot:mega https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip
RUN \
	unzip terraform_${TERRAFORM_VERSION}_linux_amd64.zip && \
	mv terraform /usr/local/bin/ && \
	chmod +x /usr/local/bin/terraform && \
	terraform --version

#####################
# Install Octant
#####################
RUN wget --progress=dot:mega https://github.com/vmware-tanzu/octant/releases/download/v${OCTANT_VERSION}/octant_${OCTANT_VERSION}_Linux-64bit.tar.gz
RUN tar -xzvf octant_${OCTANT_VERSION}_Linux-64bit.tar.gz && \
    mv octant_${OCTANT_VERSION}_Linux-64bit/octant /usr/local/bin/ && \
	chmod +x /usr/local/bin/octant

#####################
# Install Kubectl
#####################
RUN curl -LO https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl && \
    chmod +x ./kubectl && \
    mv ./kubectl /usr/local/bin && \
	echo 'source <(kubectl completion bash)' >>~/.bashrc && \
	echo 'alias k=kubectl' >>~/.bashrc && echo 'complete -F __start_kubectl k' >>~/.bashrc

# [Optional] Uncomment if you want to install more global node modules
RUN su node -c "npm install -g zx ts-node"