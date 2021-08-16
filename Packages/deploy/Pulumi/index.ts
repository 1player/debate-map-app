import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as docker from "@pulumi/docker";

// create a GCP resource (Storage Bucket)
/*const bucket = new gcp.storage.Bucket("main-bucket-1");
export const bucketName = bucket.url;*/


// Create a private GCR registry.
const registry = new gcp.container.Registry("main-registry");
const registryUrl = registry.id.apply(_=>gcp.container.getRegistryRepository().then(reg=>reg.repositoryUrl));

const deploysEnabled = {
	sharedBase: true,
	webServer: true,
	appServer: true,
};

if (deploysEnabled.sharedBase) {
	var sharedBase_info = DeployPackage("Packages/deploy/@DockerBase/Dockerfile", {imageName_base: "dm-shared-base", imageName_final: "gcr.io/debate-map-prod/dm-shared-base"});
}
export const sharedBase_baseImageName = sharedBase_info!.baseImageName;
export const sharedBase_fullImageName = sharedBase_info!.fullImageName;

if (deploysEnabled.webServer) {
	var webServer_info = DeployPackage("Packages/web-server/Dockerfile", {imageName_base: "dm-web-server"});
}
export const webServer_baseImageName = webServer_info!.baseImageName;
export const webServer_fullImageName = webServer_info!.fullImageName;

if (deploysEnabled.appServer) {
	var appServer_info = DeployPackage("Packages/app-server/Dockerfile", {imageName_base: "dm-app-server"});
}
export const appServer_baseImageName = appServer_info!.baseImageName;
export const appServer_fullImageName = appServer_info!.fullImageName;

function DeployPackage(pathToDockerfile: string, opts: {imageName_base: string, imageName_final?: string}) {
	// Get registry info (creds and endpoint).
	const imageName_final = opts.imageName_final ? opts.imageName_final : registryUrl.apply(url=>`${url}/${opts.imageName_base}`);
	const registryInfo = undefined; // use gcloud for authentication.

	// Build and publish the container image.
	const image = new docker.Image(opts.imageName_base, {
		build: {
			context: ".",
			dockerfile: pathToDockerfile,
		},
		imageName: imageName_final,
		registry: registryInfo,
	}, {
	});

	// Export the base and specific version image name.
	return {
		baseImageName: image.baseImageName,
		fullImageName: image.imageName,
	};
}