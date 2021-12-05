# Debate Map

Monorepo for the client, server, etc. of the Debate Map website ([debatemap.app](https://debatemap.app)).

> Note: The "master" branch of this repo is showing the codebase for the new monorepo setup, using [Postgraphile](https://github.com/graphile/postgraphile) for its database/backend rather than Firestore. It is still in development, so the <https://debatemap.app> website will have some discrepancies until this new version is ready and published.

# Overview

The [Debate Map](https://debatemap.app) project is a web platform aimed at improving the efficiency of discussion and debate. It's crowd-sourced and open-source, and welcomes reader contributions.

Its primary improvements are (in short):
* Restructuring dialogue to make use of both dimensions.
* Breaking down lines of reasoning into single-sentence "nodes".
* Providing rich tools that operate on those nodes -- such as rating, tagging, statistical analysis, and belief-tree sharing and comparison.

The maps are constructed from "claims" (blue), and "arguments" (green and red) which support/oppose those claims. This structure cuts down on reading time, and lets us focus on the underlying chains of reasoning instead of parsing statement meanings and connections.

For more information, visit the website at: <https://debatemap.app>

# Freeform documentation

* [Coding style](https://github.com/debate-map/app/tree/master/Docs/CodingStyle.md)
* [General conventions](https://github.com/debate-map/app/tree/master/Docs/GeneralConventions.md)
* [Client/server infrastructure](https://github.com/debate-map/app/tree/master/Docs/ClientServerInfrastructure.md)
* [Authentication](https://github.com/debate-map/app/tree/master/Docs/Authentication.md)
* [Access policies](https://github.com/debate-map/app/tree/master/Docs/AccessPolicies.md)
* [User reputation](https://github.com/debate-map/app/tree/master/Docs/UserReputation.md)
* [Node revisions](https://github.com/debate-map/app/tree/master/Docs/NodeRevisions.md)

# Guide modules

> The below is for the "active guide modules" that are likely to be used. Ones unlikely to be used are placed in the [ExtraGuideModules.md](https://github.com/debate-map/app/tree/master/Docs/ExtraGuideModules.md) file.
>
> Tip: If you want to search the text of collapsed guide-modules, you can either view the [readme's source text](https://github.com/debate-map/app/blob/master/README.md?plain=1), or open the dev-tools "Elements" tab and use its ctrl+f search function.





## For all/most contributors

### Tasks (one-time, or very rare)

<!----><a name="setup-general"></a>
<details><summary><b>[setup-general] General repo setup</b></summary>

* 1\) Ensure [NodeJS](https://nodejs.org) (v14.13.0+) is installed, as well as [Yarn](https://yarnpkg.com/getting-started/migration) (needed for Yarn workspaces).
* 2\) Clone/download this repo to disk. (https://github.com/debate-map/app.git)
* 3\) Install this repo's dependencies by running: `yarn install`

</details>

<!----><a name="vscode"></a>
<details><summary><b>[vscode] VSCode window setup</b></summary>

Prerequisite steps: [setup-general](#setup-general)

It's recommended to split your dev setup into two vscode windows:
* 1\) Window #1 in the `Packages` folder. Use this window to open files in `Packages/client`. (opening files in `Packages/common` is also fine)
* 2\) Window #2 in the repo root, for everything else. (server development, deployment, etc.)

Reasons:
* About half of the development work is done in `Packages/client`, since it is the "driver" of most changes/functionality. And having the workload split between the two windows (by "area of concern"), helps maintain tab-count sanity, and clarity of where a given file/tab should be located.
* A separate `tasks.json` file has been set up for the two folders, so having vscode windows open in them both makes it is easier to follow the guide-module instructions. That said, a single vscode-window should work, but you'll need to reference the `tasks.json` or `package-scripts.js` files to manually run certain scripts/commands.

</details>





### Tasks (occasional)





### Tasks (frequent)





### Miscellaneous





## For frontend developers (coding UI, etc.)





### Tasks (one-time, or very rare)

<!----><a name="dev-enhance"></a>
<details><summary><b>[dev-enhance] Enhance the local web-server dev experience</b></summary>

* 1\) [opt] Install: [React Development Tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
* 2\) [opt] Install: [MobX Development Tools](https://chrome.google.com/webstore/detail/mobx-developer-tools/pfgnfdagidkfgccljigdamigbcnndkod) (or [my fork](https://github.com/Venryx/mobx-devtools-advanced))

</details>





### Tasks (occasional)





### Tasks (frequent)

<!----><a name="run-frontend-local"></a>
<details><summary><b>[run-frontend-local] How to run frontend codebase, for local development</b></summary>

Prerequisite steps: [setup-k8s](#setup-k8s)

* 1\) If you've made code changes, make sure the relevant ts->js transpilation and/or bundle-building has taken place, for the frontend files.
	* 1.1\) Start task `#1 tsc` in vscode-1 (or run `npm start client.tsc`), for the ts->js transpilation.
	* 1.2\) Start task `#2 webpack` in vscode-1 (or run `npm start client.dev`), for the webpack bundle-building (and serving to `localhost:3005`).
* 2\) Start the serving of the frontend files. (ie. the files generated by step 1)
	* 2.1\) Option 1, using webpack directly: (faster, and recommended atm)
		* 2.1.1\) Do nothing. Webpack will already be serving the frontend files to `localhost:3005` (from step 1.2).
	* 2.2\) Option 2, using the web-server package within k8s:
		* 2.2.1\) If you've made code changes, build the frontend's webpack bundle into an actual file, in production mode, by starting task `## client.build.prodQuick` in vscode-1 (or running `npm start client.build.prodQuick`).
		* 2.2.2\) Run (in repo root): `npm start backend.tiltUp_local`
		* 2.2.3\) Wait till Tilt has finished deploying everything to your local k8s cluster. (can use the Tilt webpage/ui, or press `s` in the tilt terminal, to monitor)
* 3\) Open the locally-served frontend, by opening in your browser: `localhost:3005` (if you want to connect to the remote db, add `?db=prod` to the end of the url)
* 4\) If changes were made that affect the db schema (and you have a local k8s app-server that needs these changes applied), then switch k8s context to the local cluster (using tray icon), and run: `npm start "initDB_freshScript_k8s local"`

> For additional notes on using Tilt, see here: [tilt-notes](#tilt-notes)

</details>





### Miscellaneous

<!----><a name="tilt-notes"></a>
<details><summary><b>[tilt-notes] Notes on using Tilt</b></summary>

Prerequisite steps: [setup-base](#setup-base)

Notes:
* Tilt-up can fail the first several times you try, with error `Build Failed: kubernetes apply: error mapping postgres-operator.crunchydata.com/PostgresCluster3: no matches for kind "PostgresCluster3" in version "postgres-operator.crunchydata.com/v1beta1"`, I think because of a race condition where some of `deploy/PGO/postgres` runs before `deploy/PGO/install`, or something. To fix, just keep restarting, fiddling with Tilt UI, etc. till the "pgo" resource loads without error.
* For local cluster, tilt-up can also fail with the error `Get "https://kubernetes.docker.internal:6443/api?timeout=32s": net/http: TLS handshake timeout`. This most likely just means docker is out of memory (was the cause for me). To resolve: Completely close Docker Desktop, shutdown WSL2 (`wsl --shutdown`), restart Docker Desktop, then rerun `npm start backend.tiltUp_local`. More info: https://stackoverflow.com/a/6877982
* **Manually restarting the "pgo" resource will clear the database contents! Use with caution.**

</details>





## For backend developers (coding app-server, web-server, etc.)





### Tasks (one-time, or very rare)

<!----><a name="setup-base"></a>
<details><summary><b>[setup-base] Setting up base tools needed for local/remote k8s deployments</b></summary>

Required:
* 1\) Install Docker Desktop: https://docs.docker.com/desktop
	* 1.1\) If on Windows, your dynamic-ports range may start out misconfigured, which will (sometimes) cause conflicts with attempted port-forwards. See [here](https://superuser.com/a/1671710/231129) for the fix.
* 2\) Install Tilt: https://github.com/tilt-dev/tilt
* 3\) Install Chocolatey (optional if you install Helm another way): https://chocolatey.org/install
* 4\) Install Helm (eg. for some Tilt extensions): `choco install kubernetes-helm`

Highly recommended: (eg. used in multiple guide-modules)
* 1\) Install Lens, as a general k8s inspection tool: https://k8slens.dev
* 2\) Install DBeaver (ui for remote psql db's): https://dbeaver.io/download
* 3\) Install the VSCode [Kubernetes extension](https://marketplace.visualstudio.com/items?itemName=ms-kubernetes-tools.vscode-kubernetes-tools), and connect it with your kubeconfig file (eg. `$HOME/.kube/config`).
	* 3.1\) Also install the [Pod File System Explorer](https://marketplace.visualstudio.com/items?itemName=sandipchitale.kubernetes-file-system-explorer) component, enabling the Kubernetes extension to display the file-tree of running pods, and open their files.

Additional:
* 1\) Install the VSCode [Bridge to Kubernetes extension](https://marketplace.visualstudio.com/items?itemName=mindaro.mindaro), for replacing a service in a remote kubernetes cluster with one running locally (for easier/faster debugging).
* 2\) See here for more helpful tools: https://collabnix.github.io/kubetools

</details>

<!----><a name="setup-k8s"></a>
<details><summary><b>[setup-k8s] Setting up local k8s cluster</b></summary>

Prerequisite steps: [setup-base](#setup-base)

Options:
* Docker Desktop Kubernetes [recommended]
* K3d
* Kind

Notes:
* Docker Desktop has the advantage of not needing built docker-images to be "loaded" into the cluster; they were built there to begin with. This can save a *lot* of time, if full builds are slow. (for me, the deploy process takes ~3m on K3d, which Docker Desktop cuts out completely)
* K3d has the fastest deletion and recreation of clusters. (so restarting from scratch frequently is more doable)
* Docker Desktop seems to be the slowest running; I'd estimate that k3d is ~2x, at least for the parts I saw (eg. startup time).
* Docker Desktop seems to have more issues with some networking details; for example, I haven't been able to get the node-exporter to work on it, despite it work alright on k3d (on k3d, you sometimes need to restart tilt, but at least it works on that second try; with Docker Desktop, node-exporters has never been able to work). However, it's worth noting that it's possible it's (at least partly) due to some sort of ordering conflict; I have accidentally had docker-desktop and k3d and kind running at the same time often, so the differences I see may just be reflections of a problematic setup.

#### Setup for Docker Desktop Kubernetes [recommended]

* 1\) Create your Kubernetes cluster in Docker Desktop, by checking "Enable Kubernetes" in the settings, and pressing apply/restart.

> To delete and recreate the cluster, use the settings panel.

#### Setup for K3d

* 1\) Download and install from here: https://k3d.io/#installation
* 2\) Create a local registry: `k3d registry create reg.localhost --port 5000`
* 3\) Create a local cluster: `k3d cluster create main-1 --registry-use k3d-reg.localhost:5000` (resulting image will be named `k3d-main-1`)
* 4\) Add an entry to your hosts file, to be able to resolve `reg.localhost`:
	* 4.1\) For Windows: Add line `127.0.0.1 k3d-reg.localhost` to `C:\Windows\System32\Drivers\etc\hosts`.
	* 4.2\) For Linux: Add line `127.0.0.1 k3d-reg.localhost` to `/etc/hosts`. (on some Linux distros, this step isn't actually necessary)

> To delete and recreate the cluster: `k3d cluster delete main-1 && k3d cluster create main-1`

#### Setup for Kind

* 1\) Download and install from here: https://kind.sigs.k8s.io/docs/user/quick-start/#installation
* 2\) Run: `kind create cluster --name main-1` (resulting image will be named `kind-main-1`)

> To delete and recreate the cluster: `kind delete cluster --name main-1 && kind create cluster --name main-1`

#### After steps

* 1\) Create an alias/copy of the k8s context you just created, renaming it to "local". (edit `$HOME/.kube/config`)
* 2\) [opt] To make future kubectl commands more convenient, set the context's default namespace: `kubectl config set-context --current --namespace=app`

#### Troubleshooting

* If your namespace gets messed up, delete it using this (regular kill command gets stuck): `npm start "backend.forceKillNS NAMESPACE_TO_KILL"` (and if that is insufficient, just reset the whole Kubernetes cluster using Docker Desktop UI)
* When the list of images/containers in Docker Desktop gets too long, see the [docker-trim](#docker-trim) module.

</details>

<!----><a name="general"></a>
<details><summary><b>[general] General</b></summary>

* 1\) Temp: Add "type:module" to a number of packages, till they're fixed. (see here: https://github.com/apollographql/apollo-client/pull/8396#issuecomment-894563662)
* 2\) Copy the `.env.template` file in the repo root, rename the copy to `.env`, and fill in the necessary environment-variables. (The sections below will show which of those environment variables are needed, and how to supply them.)

</details>





### Tasks (occasional)

<!----><a name="docker-trim"></a>
<details><summary><b>[image-inspect] Docker image/container inspection</b></summary>

Prerequisite steps: [setup-base](#setup-base)

Tools:
* Make a shortcut to `\\wsl$\docker-desktop-data\version-pack-data\community\docker\overlay2`; this is the path you can open in Windows Explorer to view the raw files in the docker-built "layers". (ie. your project's output-files, as seen in the docker builds)
* Install the Docker "dive" tool (helps for inspecting image contents without starting container): https://github.com/wagoodman/dive
* To inspect the full file-contents of an image: `docker save IMAGE_NAME -o ./Temp/output.tar` (followed by extraction, eg. using [7-zip](https://www.7-zip.org))

</details>

<!----><a name="docker-trim"></a>
<details><summary><b>[docker-trim] Docker image/container trimming</b></summary>

Prerequisite steps: [setup-base](#setup-base)

* 1\) When the list of images in Docker Desktop gets too long, press "Clean up" in the UI, check "Unused", uncheck non-main-series images, then press "Remove". (run after container-trimming to get more matches)
* 2\) When the list of containers in Docker Desktop gets too long, you can trim them using a Powershell script like the below: (based on: https://stackoverflow.com/a/68702985)
```
$containers = (docker container list -a).Split("`n") | % { [regex]::split($_, "\s+") | Select -Last 1 }
$containersToRemove = $containers | Where { ([regex]"^[a-z]+_[a-z]+$").IsMatch($_) }

# it's recommended to delete in batches, as too many at once can cause issues
$containersToRemove = $containersToRemove | Select-Object -First 30

foreach ($container in $containersToRemove) {
	# sync/wait-based version (slow)
	# docker container rm $container

	# async/background-process version (fast)
	Start-Process -FilePath docker -ArgumentList "container rm $container" -NoNewWindow
}
```

</details>





### Tasks (frequent)

<!----><a name="run-backend-local"></a>
<details><summary><b>[run-backend-local] How to run backend codebase, for local development</b></summary>

Prerequisite steps: [setup-k8s](#setup-k8s)

* 1\) Run the `dev` script for the package you're working on. (usually `npm start [app/web]-server.dev`, which equates to the `#1 app-server.dev` and `## web-server.dev` vscode tasks)
* 2\) Start the web-server (ie. the serving of frontend files), by following the [run-frontend-local](#run-frontend-local) module above.
* 3\) Start the app-server:
	* 3.1\) Option 1, using node directly: (not recommended atm)
		* 3.1.1\) Run: `npm start app-server.dev` (vscode task: `#1 app-server.dev`)
	* 3.2\) Option 2, using the app-server package within k8s:
		* 3.2.1\) Run (in repo root): `npm start backend.tiltUp_local`
		* 3.2.2\) Wait till Tilt has finished deploying everything to your local k8s cluster. (can use the Tilt webpage/ui, or press `s` in the tilt terminal, to monitor)
* 4\) If changes were made that affect the db schema, switch k8s context to the local cluster, then run: `npm start "initDB_freshScript_k8s local"`

> For additional notes on using Tilt, see here: [tilt-notes](#tilt-notes)

</details>





### Miscellaneous

## For backend deployers/maintainers

### Tasks (one-time, or very rare)

<!----><a name="cloud-project-init"></a>
<details><summary><b>[cloud-project-init] Cloud-projects initialization (eg. creating Google Cloud project for Pulumi to work within)</b></summary>

Note: We use Google Cloud here, but others could be used.

* 1\) Ensure you have a user-account on Google Cloud Platform: https://cloud.google.com/
* 2\) Install the Google Cloud SDK: https://cloud.google.com/sdk/docs/install
* 3\) Authenticate the gcloud sdk/cli by providing it with the key-file for a service-account with access to the project you want to deploy to.
	* 3.1\) For the main Google Cloud project instance, you'll need to be supplied with the service-account key-file. (contact Venryx)
	* 3.2\) If you're creating your own fork/deployment, you'll need to:
		* 3.2.1\) Create a GCP project.
		* 3.2.2\) Enable the Container Registry API for your GCP project: https://console.cloud.google.com/apis/library/containerregistry.googleapis.com
		* 3.2.3\) Create a service-account: (it's possible a user account could also be granted access directly, but service-accounts are recommended anyway)
			* 3.2.3.1\) Go to: https://console.cloud.google.com/iam-admin/serviceaccounts/create
			* 3.2.3.2\) Choose a service-account name, and add the role "Container Registry Service Agent" and "Storage Admin" (*not* the weaker "Storage Object Admin").
			* 3.2.3.3\) In the "Service account admins role" box, enter your email.
			* 3.2.3.4\) In the "Service account users role" box, enter your email, and the email of anyone else you want to have access.
			* 3.2.3.5\) Create a key for your service account, and download it as a JSON file (using the "Keys" tab): https://console.cloud.google.com/iam-admin/serviceaccounts
	* 3.3\) Move (or copy) the JSON file to the following path: `Packages/deploy/PGO/postgres/gcs-key.json`
	* 3.4\) Add the service-account to your gcloud-cli authentication, by passing it the service-account key-file (obtained from step 3.1 or 3.2.3.5): `gcloud auth activate-service-account FULL_SERVICE_ACCOUNT_NAME_AS_EMAIL --key-file=Packages/deploy/PGO/postgres/gcs-key.json`
	* 3.5\) Add the service-account to your Docker authentication, in a similar way: `Get-Content Packages/deploy/PGO/postgres/gcs-key.json | & docker login -u _json_key --password-stdin https://gcr.io` (if you're using a specific subdomain of GCR, eg. us.gcr.io or eu.gcr.io, fix the domain part in this command)

</details>

<!----><a name="pulumi-init"></a>
<details><summary><b>[pulumi-init] Pulumi initialization (provisioning GCS bucket, container registry, etc.)</b></summary>

Prerequisite steps: [cloud-project-init](#cloud-project-init)

Note: We use Google Cloud here, but others could be used.

* 1\) Install the Pulumi cli: `https://www.pulumi.com/docs/get-started/install`
* 2\) Ensure that a Pulumi project is set up, to hold the Pulumi deployment "stack".
	* 2.1\) Collaborators on the main release can contact Stephen (aka Venryx) to be added as project members (you can view it online [here](https://app.pulumi.com/Venryx/debate-map) if you have access).
	* 2.2\) If you're creating your own fork/deployment:
		* 2.2.1\) Create a new Pulumi project [here](https://app.pulumi.com). Make sure your project is named `debate-map`, so that it matches the name in `Pulumi.yaml`.
* 3\) Run: `npm start pulumiUp` (`pulumi up` also works, *if* the last result of `npm start backend.dockerPrep` is up-to-date)
* 4\) Select the stack you want to deploy to. (for now, we always deploy to `prod`)
* 5\) Review the changes it prepared, then proceed with "yes".
* 6\) After a bit, the provisioning/updating process should complete. There should now be a GCS bucket, container registry, etc. provisioned, within the Google Cloud project whose service-account was associated with Pulumi earlier.
* 7\) If the deploy went successfully, a `PulumiOutput_Public.json` file should be created in the repo root. This contains the url for your image registry, storage bucket, etc. The Tiltfile will insert these values into the Kubernetes YAML files in various places; to locate each of these insert points, you can search for the `TILT_PLACEHOLDER:` prefix.
* 8\) However, there are currently still a couple places where those creating their own fork/deployment will need to change hard-coded values:
	* 8.1\) For each package that you'll be deploying, update the `SHARED_BASE_URL` variable to match the image-url for `dm-shared-base` seen in the Tiltfile (ie. `${registryURL}/dm-shared-base`). Unfortunately the argument's value cannot be set from the Tiltfile yet, because otherwise Tilt thinks the shared-base image is unused. (ie. it doesn't see the link between the shared-base image and the server images, unless the shared-base's image-url is hard-coded in the latter's Dockerfiles)

</details>

<!----><a name="ovh-init"></a>
<details><summary><b>[ovh-init] OVH initialization (provisioning remote kubernetes cluster)</b></summary>

Note: We use OVHCloud's Public Cloud servers here, but others could be used.

* 1\) Create a Public Cloud project on OVH cloud. (in the US, us.ovhcloud.com is recommended for their in-country servers)
* 2\) Follow the instructions here to setup a Kubernetes cluster: https://youtu.be/vZOj59Oer7U?t=586  
	* 2.1\) In the "node pool" step, select "1". (Debate Map does not currently need more than one node)  
	* 2.2\) In the "node type" step, select an option. (cheapest is Discovery d2-4 at ~$12/mo, but I use d2-8 at ~$22/mo to avoid occasional OOM issues)
* 3\) Run the commands needed to integrate the kubeconfig file into your local kube config.
* 4\) Create an alias/copy of the "kubernetes-admin@Main_1" k8s context, renaming it to "ovh". (edit `$HOME/.kube/config`)
* 5\) Add your Docker authentication data to your OVH Kubernetes cluster.
	* 5.1\) Ensure that your credentials are loaded, in plain text, in your docker `config.json` file. By default, Docker Desktop does not do this! So most likely, you will need to:
		* 5.1.1\) Disable the credential-helper, by opening `$HOME/.docker/config.json`, and setting the `credsStore` field to **an empty string** (ie. `""`).
		* 5.1.2\) Log in to your image registry again. (ie. rerun step 3.5 of [cloud-project-init](#cloud-project-init))
		* 5.1.3\) Submit the credentials to OVH: `kubectl --context ovh create secret --namespace app generic registry-credentials --from-file=.dockerconfigjson=PATH_TO_DOCKER_CONFIG --type=kubernetes.io/dockerconfigjson` (the default path to the docker-config is `$HOME/.docker/config.json`, eg. `C:/Users/YOUR_USERNAME/.docker/config.json`)
	* 5.1\) You can verify that the credential-data was uploaded properly, using: `kubectl --context ovh get --namespace default -o json secret registry-credentials` (currently we are pushing the secret to the `default` namespace, as that's where the `web-server` and `app-server` pods currently are; if these pods are moved to another namespace, adjust this line accordingly)

</details>

<!----><a name="dns-setup"></a>
<details><summary><b>[dns-setup] How to set up DNS and CDN (if creating own fork/deployment)</b></summary>

Note: We use Cloudflare here, but others could be used.

* 1\) If not done already, update the domain-names in the code and k8s YAML files (eg. `dmvx-ingress.yaml`) to point to your chosen domain-names.
* 2\) Create a Cloudflare account, and start the add-website process on it. Follow the instructions for basic setup.
	* 2.1\) On your domain registrar manager/website, make sure that you configure Cloudflare as the DNS Name Servers.
	* 2.2\) On Cloudflare, make sure that you add an entry for both the web-server and app-server. (both pointing to the OVH kubernetes cluster host-name)
* 3\) Set up a redirect from `www.YOUR_DOMAIN.YOUR_TLD` to `YOUR_DOMAIN.YOUR_TLD`. (using the Rules section, as [seen here](https://community.cloudflare.com/t/redirecting-www-to-non-www/2949/28))
* 4\) Enable the "SSL/TLS" -> "Edge Certificates" -> "Always Use HTTPS" option. (seems to not really be necessary, presumably because Traefik doesn't respond for non-https requests so Chrome retries with https automatically, but good practice)

</details>

<!----><a name="oauth-setup"></a>
<details><summary><b>[oauth-setup] How to set up oauth</b></summary>

In order to use the oauth options for sign-in (eg. Google Sign-in), the frontend either must be running on `localhost:[3005/31005]`, or you have to create your own online "application" configs/entries on each of the oauth-providers' platforms. The below instructions are for creating those "application" configs/entries. (replace the domains with your own, of course)

Google Sign-in:
* 1\) Create a Google Cloud project for your fork.
* 2\) Go to: https://console.cloud.google.com/apis/credentials?project=YOUR_PROJECT_NAME
* 3\) In the "Credentials->OAuth 2.0 Client IDs" section, create a new "Web Application" entry.
* 4\) Set the values below: (yes, the plain `localhost` one is [also needed](https://stackoverflow.com/a/68469319))
```
Authorized JavaScript Origins:
* http://localhost
* http://localhost:3005
* http://[::1]:3005
* https://9m2x1z.nodes.c1.or1.k8s.ovh.us
* https://debatemap.app
* https://debates.app

Authorized redirect URIs:
* http://localhost:3105/auth/google/callback
* http://[::1]:3105/auth/google/callback
* https://app-server.9m2x1z.nodes.c1.or1.k8s.ovh.us/auth/google/callback
* https://app-server.debatemap.app/auth/google/callback
* https://app-server.debates.app/auth/google/callback
* https://app-server.debatemap.app/auth/google/callback_returnToLocalhost
* https://app-server.debates.app/auth/google/callback_returnToLocalhost
```

</details>





### Tasks (occasional)

<!----><a name="k8s-monitors"></a>
<details><summary><b>[k8s-monitors] Various commands/info on monitoring system (prometheus, etc.)</b></summary>

* To open a bash shell in the main prometheus pod: `kubectl exec -it prometheus-k8s-[0/1] -n monitoring -- sh` (or just use Lens)
* To view the Grafana monitor webpage, open: `localhost:[3405/4405]` (`3405` for local, `4405` for remote, if using Tilt; if not, manually launch using Lens)
	> The page will ask for username and password. On first launch, this will be `admin` and `admin`.
	>
	> The Grafana instance has been preconfigured with some useful dashboards, which can be accessed through: Dashboards (in sidebar) -> Manage -> Default -> [dashboard name]. You can import additional plugins/dashboards from the Grafana [plugin library](https://grafana.com/grafana/plugins) and [dashboard library](https://grafana.com/grafana/dashboards).
<!-- * To view the Prometheus monitor webpage, open (not currently working): `localhost:31002` -->
* To view the Prometheus monitor webpage, open the k8s cluster in Lens, find the `prometheus` service, then click it's "Connection->Ports" link.
	> The page will ask for username and password. On first launch, this will be `admin` and `admin`.
<!-- * To view the cAdvisor monitor webpage, open (not currently working): `localhost:31001` -->
* To view the cAdvisor monitor webpage [not currently working/enabled], open the k8s cluster in Lens, find the `cadvisor` service, then click it's "Connection->Ports" link.
* To view cpu and memory usage for pods using k8s directly (no external tools), run: `kubectl top pods --all-namespaces` (for additional commands, see [here](https://raaviblog.com/how-to-find-the-current-cpu-and-memory-usage-of-all-the-pods-in-kubernetes-cluster))

</details>

<!----><a name="k8s-ssh"></a>
<details><summary><b>[k8s-ssh] How to ssh into your k8s pods (web-server, app-server, database, etc.)</b></summary>

* For web-server: `npm start ssh.web-server`
* For app-server: `npm start ssh.app-server`
* For database: `npm start ssh.db`
* For others: `kubectl exec -it $(kubectl get pod -o name -n NAMESPACE -l LABEL_NAME=LABEL_VALUE) -- bash`

Note: If you merely want to explore the file-system of a running pod, it's recommended to use the [Kubernetes Pod File System Explorer](https://marketplace.visualstudio.com/items?itemName=sandipchitale.kubernetes-file-system-explorer) VSCode extension, as it's faster and easier. For editing files, see here: https://github.com/sandipchitale/kubernetes-file-system-explorer/issues/4

</details>

<!----><a name="port-forwarding"></a>
<details><summary><b>[port-forwarding] How to set up port-forwarding for your k8s db, etc.</b></summary>

For database pod:
* 1\) If you have tilt running, a port-forward should already be set up, on the correct port. (`3205` for your local cluster, and `4205` for your remote cluster)
* 2\) You can also set up the port-forwarding by running the script: `npm start backend.forward_[local/remote]DB`

</details>

<!----><a name="k8s-psql"></a>
<details><summary><b>[k8s-psql] How to connect to postgres in your kubernetes cluster, using psql</b></summary>

Note: The instructions below are written to work for both the local and remote k8s clusters. Some substitutions are thus needed:
* Anywhere you see `[local/ovh]`, replace it with `local` for your local cluster, and `ovh` for your remote cluster. (can also be omitted, if current context matches your target)
* Anywhere you see `[3205/4205]`, replace it with `3205` for your local cluster, and `4205` for your remote cluster.

The easy way:
* 1\) Run: `npm start "ssh.db [linux/ovh]"`
* 2\) Run (in vm shell that opens): `psql`

The hard way: (using external psql with port-forwarding, rather than ssh'ing into the pod directly)
* 1\) Set up a port-forward from `localhost:[3205/4205]` to your k8s database pod. (see: [port-forwarding](#port-forwarding))
* 2\) To access `psql`, as the "admin" user, run the below...
	* 2.1\) In Windows (PS), option A: `$env:PGPASSWORD=$(kubectl --context [local/ovh] -n postgres-operator get secrets debate-map-pguser-admin -o go-template='{{.data.password | base64decode}}'); psql -h localhost -p [3205/4205] -U admin -d debate-map`
	* 2.2\) In Windows (PS), option B: `Add-Type -AssemblyName System.Web; psql "postgresql://admin:$([System.Web.HTTPUtility]::UrlEncode("$(kubectl --context [local/ovh] -n postgres-operator get secrets debate-map-pguser-admin -o go-template='{{.data.password | base64decode}}')"))@localhost:[3205/4205]/debate-map"`
	* 2.3\) In Linux/WSL, option A (not working atm; can't access tilt's port-forwards): `PGPASSWORD="$(kubectl --context [local/ovh] -n postgres-operator get secrets debate-map-pguser-admin -o go-template='{{.data.password | base64decode}}')" psql -h localhost -p [3205/4205] -U admin -d debate-map`
	* 2.4\) In Linux/WSL, option B (not working atm; same reason): `psql "postgresql://admin:$(printf %s "$(kubectl --context [local/ovh] -n postgres-operator get secrets debate-map-pguser-admin -o go-template='{{.data.password | base64decode}}')"|jq -sRr @uri)@localhost:[3205/4205]/debate-map"`
* 3\) To access `psql`, as the "debate-map" user, replace "admin" with "debate-map" and "debate-map-pguser-admin" with "debate-map-pguser-debate-map" in commands above.
* 4\) To access `psql`, as the "postgres" user: I don't know how yet. (I couldn't find a "secrets" entry for it using kubectl)

Note: The `psql` binary is not installed in Linux/WSL at the start. If you want `psql` runnable from within WSL, run the below setup:
```
sudo apt install postgresql-client-common
# make above usable by providing implementation (from: https://stackoverflow.com/a/60923031)
sudo apt update
sudo apt -y upgrade
sudo apt -y install vim bash-completion wget
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
echo "deb http://apt.postgresql.org/pub/repos/apt/ `lsb_release -cs`-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list
sudo apt update
sudo apt -y install postgresql-client-13
```

</details>

<!----><a name="k8s-view-pg-config"></a>
<details><summary><b>[k8s-view-pg-config] How to view various postgres config files in the kubernetes cluster</b></summary>

To view the pg config files `postgresql.conf`, `pg_hba.conf`, etc.:
* 1\) Run: `kubectl exec -it $(kubectl get pod -n postgres-operator -o name -l postgres-operator.crunchydata.com/cluster=debate-map,postgres-operator.crunchydata.com/role=master) -- bash`
* 2\) Run (in new bash): `cat /pgdata/pg13/XXX`

</details>

<!----><a name="db-migrate"></a>
<details><summary><b>[db-migrate] Database migrations</b></summary>

See here for overview: <https://github.com/Venryx/web-vcore/tree/master/Docs/DatabaseMigrations.md>

Actions:
* To create a new migration, make a copy of the latest migration in `Knex/Migrations`, rename it (incrementing the number), then clear the up/down functions.

</details>





### Tasks (frequent)

<!----><a name="k8s-remote"></a>
<details><summary><b>[k8s-remote] How to deploy web+app server packages to remote server, using docker + kubernetes</b></summary>

Prerequisite steps: [pulumi-init](#pulumi-init), [ovh-init](#ovh-init)

* 1\) Ensure that the distribution files are ready for any packages you've made changes to:
	1.1\) If you've changed files in `client`, then follow its ts->js transpilation instructions, then build the webpack bundle into an actual file, in production mode, by starting task `## client.build.prodQuick` in vscode-1 (or running `npm start client.build.prodQuick`).
	1.2\) If you've changed files in `web-server` or `app-server`, then follow its ts->js transpilation instructions.
* 2\) Run: `npm start backend.tiltUp_ovh` (reminder: if you've made code changes, make sure the relevant ts->js transpilation and/or bundle-building has taken place, as accomplished through the `tsc`/`dev`/`build` scripts of each package)
* 3\) Verify that the deployment was successful, by visiting the web-server: `http://CLUSTER_URL:4105`. (replace `CLUSTER_URL` with the url listed in the OVH control panel)
* 4\) If you haven't yet, initialize the DB:
	* 4.1\) Run: `npm start "app-server.initDB_freshScript_k8s ovh"`
* 5\) You should now be able to sign in, on the web-server page above. The first user that signs in is assumed to be one of the owner/developer, and thus granted admin permissions.

> For additional notes on using Tilt, see here: [tilt-notes](#tilt-notes)

</details>

<!----><a name="pg-backups"></a>
<details><summary><b>[pg-backups] Information on backups for your in-kubernetes database</b></summary>

General notes:
* Automatic backups are already set up, writing to the `debate-map-prod-uniform-private` bucket provisioned by Pulumi in the Google Cloud, at the path: `/db-backups-pgbackrest`.
* Schedule: Once a week, a "full" backup is created; once a day, a "differential" backup is created.
* If you ever get the error `command terminated with exit code 28: ERROR: [028]: backup and archive info files exist but do not match the database HINT: is this the correct stanza? HINT: did an error occur during stanza-upgrade?`, see [here](https://github.com/pgbackrest/pgbackrest/issues/1066#issuecomment-907802025) for an explanation/solution.

Backup structure:
* Backups in pgbackrest are split into two parts: base-backups (the `db-backups-pgbackrest/backup` cloud-folder), and wal-archives (the `db-backups-pgbackrest/archive` cloud-folder).
	* Base-backups are complete physical copies of the database, as seen during the given generation period. (well, complete copies if of type `full`; `differential` backups rely on the last `full` backup to be complete, and `incremental` backups rely on the last `full` backup, the last `differential` (if any), along with the in-between series of `incremental` backups)
	* Wal-archives are small files that are frequently being created, which is basically a streaming "changelog" of database updates. Wal-archives allow you to do point-in-time restores to arbitrary times, by augmenting the base-backups with the detailed sequence of changes since them.

Actions:
* To view the list of backups in the Google Cloud UI, run: `npm start backend.viewDBBackups`

To manually trigger the creation of a full backup:
* 1\) Run: `npm start backend.makeDBBackup`
* 2\) Confirm that the backup was created by viewing the list of backups. (using `npm start backend.viewDBBackups`)
	* 2.1\) If the backup failed (which is problematic because it seems to block subsequent backup attempts), you can:
		* 2.1.1\) Trigger a retry by running `npm start backend.makeDBBackup_retry` PGO will then notice the unfinished job is missing and recreate it, which should hopefully work this time.
		* 2.1.2\) Or cancel the manual backup by running: `npm start backend.makeDBBackup_cancel`

To restore a backup:
* 1\) Find the point in time that you want to restore the database to. Viewing the list of base-backups in the Google Cloud UI (using `npm start backend.viewDBBackups`) can help with this, as a reference point (eg. if you made a backup just before a set of changes you now want to revert).
* 2\) Prepare the postgres-operator to restore the backup, into either a new or the current postgres instance/pod-set:
	* 2.1\) Option 1, into a new postgres instance/pod-set that then gets promoted to master (PGO recommended way):
		* 2.1.1\) Ensure that the tilt-up script is running for the target context. (and disable any tilt-up scripts running for other contexts)
		* 2.1.2\) Uncomment the `dataSource` field in `postgres.yaml`, uncomment + fill-in the section matching the restore-type you want (then save the file):
			* 2.1.2.1\) If you want to restore exactly to a base-backup (without any wal-archive replaying), use the first section. (modifying "set" to the base-backup folder-name seen in the cloud-bucket)
				* 2.1.2.1.1\) At the moment, you also have to run a `psql` command to complete the restore. See [here](https://github.com/CrunchyData/postgres-operator/issues/1886#issuecomment-907784977).
			* 2.1.2.2\) If you want to restore to a specific point-in-time (with wal-archive replaying), use the second section. (modifying "target" to the time you want to restore to, with a specified timezone [UTC recommended])
	* 2.2\) Option 2, into the existing postgres instance/pod-set (imperative, arguably cleaner way -- but not yet working/reliable):
		* 2.2.1\) Run: `npm start "backend.restoreDBBackup_prep BACKUP_LABEL"` This script patches the postgres-operator deployment/configuration to contain [the fields](https://access.crunchydata.com/documentation/postgres-operator/5.0.2/tutorial/disaster-recovery/#perform-an-in-place-point-in-time-recovery-pitr) that mark a restoration as active, and specify which backup to use.
* 3\) To actually activate the restore operation, run: `npm start backend.restoreDBBackup_apply` This will update the `.../pgbackrest-restore` annotation on the postgres-operator CRD to the current-time, which the operator interprets as the "go signal" to apply the specifying restoration operation.
	* 3.1\) If using approach 1, you also have to restart [possibly twice, if it gets stuck] the `pgo` resource using the Tilt UI here. (this clears the old instance/pod-set, and creates a new one, which then tries to load from the specified data-source)
* 4\) Observe the logs in the Tilt UI, to track the progress of the restore. (it takes about 2.5 minutes just to start, so be patient; also, you can ignore the `WARN: --delta or --force specified but unable to find...` message, as that just means it's a fresh cluster that has to restore from scratch, which the restore module finds odd since it notices the useless [automatically added] delta/force flag)
* 5\) Check whether the restore operation succeeded, by loading up the website. (you may have to wait a bit for the app-server to reconnect; you can restart it manually to speed this up)
	* 5.1\) If you get an error in the `app-server` pod about `error: password authentication failed for user "admin"`, then it seems the `debate-map-pguser-admin` secret was already created (by pgo) prior to the restore, which may have made it invalid after the restore was completed (if the credentials differ). To resolve this, you can either:
		5.1.1\) Delete the `debate-map-pguser-admin` secret in the `postgres-operator` namespace; pgo will recreate it in a few seconds, with a working set of credentials (and the reflected version of the secret, in the `default` namespace, will be updated a few seconds later). Note that in this process, the admin user's password is actually reset to a new (random) value, so you will have to copy the secret's password value for use in third-party programs accessing the database (eg. DBeaver).
		5.1.2\) Alternately, you can modify the `debate-map-pguser-admin` secret (in the `postgres-operator` namespace) to hold the password value that was stored in the postgres backup that was just restored (this approach not yet tested, but presumably should work). One place you may have the old password stored is in DBeaver's password store, which can you decrept using [these instructions](https://stackoverflow.com/a/58223703).
* 6\) If the restore operation did not succeed, you'll want to either make sure it does complete, or cancel the restore operation (else it will keep trying to apply the restore, which may succeed later on when you don't want or expect it to, causing data loss). To cancel the restore:
	* 6.1\) If option 1 was taken: Recomment the `dataSource` field in `postgres.yaml`, then save the file.
	* 6.2\) If option 2 was taken: Run: `npm start backend.restoreDBBackup_cancel`.
* 7\) After the restore is complete, clean things up:
	* 7.1\) If option 1 was taken: Recomment the `dataSource` field in `postgres.yaml`, then save the file. (needed so the restore operation is not attempted for other contexts, when their tilt-up scripts are run)
	* 7.2\) If option 2 was taken: No action is necessary, because the postgres-operator remembers that the last-set value for the `pgbackrest-restore` annotation has already been applied, and the restore config was only placed into the target context. (If you want to be extra sure, though, you could follow step 6.2; this is fine, because the restore has already taken place, so it will not be reverted or the like.)

</details>

<!----><a name="k8s-troubleshooting"></a>
<details><summary><b>[k8s-troubleshooting] How to resolve various k8s-related issues</b></summary>

* 1\) In some cases, when pushing a new pod version to your k8s cluster, the pod will fail to be added, with the message `0/1 nodes are available: 1 node(s) had taint {node.kubernetes.io/memory-pressure: }, that the pod didn't tolerate.`
	* 1.1\) You can manually remove the taint by running (as seen [here](https://stackoverflow.com/a/63471551/2441655)): `kubectl taint node <nodename> node.kubernetes.io/memory-pressure:NoSchedule-`
		1.1.1\) Update: This didn't actually seem to work for me. Perhaps k8s is instantly re-applying the taint, since it's based on a persistent memory shortage? Anyway, currently I just wait for the memory shortage to resolve (somehow).
		1.1.2\) For now, another workaround that *seems* to help (from a couple tries), is opening pod-list in Lens, searching for all pods of the given type, selecting-all, then removing/killing all.
* 2\) If you get the error "Unable to attach or mount volumes: unmounted volumes [...]" (in my case, after replacing a 4gb node-pool with an 8gb one), the issue may be that the stale persistent-volume-claims requested by the old nodes are still sticking around, causing new claims for the new node to not get created (issue [described here](https://veducate.co.uk/kubelet-unable-attach-volumes/)). To fix this:
	* 2.1\) Run `npm start backend.tiltDown_ovh`.
	* 2.2\) Tilt-down appears to not delete everything, so complete the job by using Tilt to manually delete anything added by our project: basically everything except what's in the `kube-node-lease`, `kube-public`, and `kube-system` namespaces.
		* 2.2.1\) Regular deletion (eg. through the Lens UI) works fine for the following found leftovers: stateful sets, config maps, secrets, and services.
		* 2.2.2\) For leftover namespaces: this deadlocks for me, seemingly due to the postgres-operator CRD having a deadlock occuring during its "finalizer", as [described here](https://stackoverflow.com/a/52012367) (causing its `postgres-operator` namespace to stick around in a bad "terminating" state). See [here](https://stackoverflow.com/a/52377328) to confirm what resources underneath that namespace are causing it to stick around, and then follow the steps below (assuming it's the CRD and/or PV/PVCs) to remove them, then the deadlocked namespace deletion task itself should complete. 
		* 2.2.3\) For the postgres-operator CRD, edit the manifest (eg. using the Lens UI's "Edit" option) to have its "finalizers" commented out, then delete like normal.
		* 2.2.4\) For the persistent-volumes and persistent-volume-claims, due the same thing: comment out its "finalizers", then delete like normal.
	* 2.3\) Rerun the tilt-up script.
	* 2.4\) EDIT: After doing the above, the issue still remains :(. Based on my reading, the above "should" fix it, but it hasn't. For now, I'm resolving this issue by just completely resetting the cluster. (with "Computing nodes" option set to "Keep and reinstall nodes" -- the "Delete nodes" option appears to not be necessary)

</details>





### Miscellaneous