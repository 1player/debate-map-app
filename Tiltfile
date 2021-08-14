# this is supposed to let us use the "local" k8s context;
#		problem is that tilt doesn't recognize it as local, so tries to push images to "local.tilt.dev", which fails;
#		so just using the base "docker-desktop" context instead, for now
#allow_k8s_contexts('local')

# allow using tilt to push to the remote OVHcloud k8s cluster
allow_k8s_contexts('ovh')

#k8s_yaml('./Packages/deploy/k8s_entry.yaml')
# todo: integrate these into the entry-file above (probably)
k8s_yaml(kustomize('./Packages/deploy/install'))
k8s_yaml(kustomize('./Packages/deploy/postgres'))
k8s_yaml('./Packages/app-server/deployment.yaml')
k8s_yaml('./Packages/web-server/deployment.yaml')

#k8s_yaml('./Packages/deploy/Monitors/kube-prometheus/manifests/setup/prometheus-operator-0probeCustomResourceDefinition.yaml')

'''def k8s_yaml_folder(folderPath):
	fileNames = str(local(['powershell', '-c', 'Get-ChildItem ' + folderPath + ' -file | Select -exp Name'])).strip().replace('\r', '').split("\n")
	for fileName in fileNames:
		k8s_yaml(folderPath + '/' + fileName)

k8s_yaml_folder('./Packages/deploy/Monitors/kube-prometheus/manifests/setup');
#local('wsl until kubectl get servicemonitors --all-namespaces ; do date; sleep 1; echo ""; done')
# for now, comment out the line below until everything shows green in tilt; then uncomment it, and `tilt up` again
k8s_yaml_folder('./Packages/deploy/Monitors/kube-prometheus/manifests');'''

k8s_yaml(kustomize('./Packages/deploy/Monitors/kube-prometheus/overlay'))

nmWatchPathsStr = local(['node', '-e', "console.log(require('./Scripts/NodeModuleWatchPaths.js').nmWatchPaths.join(','))"])
nmWatchPaths = str(nmWatchPathsStr).strip().split(",")
'''liveUpdateEntries_shared = []
for path in nmWatchPaths:
	liveUpdateEntries_shared.append(sync('./' + path, '/dm_repo/' + path))'''

# this keeps the NMOverwrites folder up-to-date, with the live contents of the node-module watch-paths (as retrieved above)
#local(['node', 'Scripts/NMOverwrites/Build.js', '--async'])
local(['npx', 'file-syncer', '--from'] + nmWatchPaths + ['--to', 'NMOverwrites', '--replacements', 'node_modules/web-vcore/node_modules/', 'node_modules/', '--clearAtLaunch', '--async', '--autoKill'])

# this is the base dockerfile used for all the subsequent ones
docker_build('local.tilt.dev/dm-repo-shared-base', '.', dockerfile='Packages/deploy/@DockerBase/Dockerfile')

docker_build('local.tilt.dev/dm-app-server', '.', dockerfile='Packages/app-server/Dockerfile',
	# this lets Tilt update the listed files directly, without involving Docker at all
	#live_update=liveUpdateEntries_shared + [
	live_update=[
		sync('./NMOverwrites/', '/dm_repo/'),
		#sync('./Packages/app-server/Dist/', '/dm_repo/Packages/app-server/Dist/'),
		sync('./Packages/app-server/', '/dm_repo/Packages/app-server/'),
	])
docker_build('local.tilt.dev/dm-web-server', '.', dockerfile='Packages/web-server/Dockerfile',
	# this lets Tilt update the listed files directly, without involving Docker at all
	#live_update=liveUpdateEntries_shared + [
	live_update=[
		sync('./NMOverwrites/', '/dm_repo/'),
		#sync('./Packages/web-server/Dist/', '/dm_repo/Packages/web-server/Dist/'),
		sync('./Packages/web-server/', '/dm_repo/Packages/web-server/'),
	])

# port forwards
# ==========

# the web-server forward works, but it makes 31005 unusuable then (I guess can only forward to one port at once); app-server forward didn't work
'''k8s_resource('dm-web-server', 
	#extra_pod_selectors={"app": "dm-web-server"}, # this is needed fsr
	#port_forwards='3005:31005')
	port_forwards='3005')
k8s_resource('dm-app-server', 
	#extra_pod_selectors={"app": "dm-app-server"}, # this is needed fsr
	#port_forwards='3105:31105')
	port_forwards='3105')'''

# prometheus monitoring tool; open localhost:9090 in browser to view
'''k8s_resource('prometheus-operator',
	#port_forwards='9090:9090')
	port_forwards='9090')'''

#k8s_resource('debate-map-primary', port_forwards='5432:5432') # db
#k8s_resource('pgo', port_forwards='3205:5432') # db
k8s_resource('pgo',
	extra_pod_selectors={
		"postgres-operator.crunchydata.com/cluster": "debate-map",
		"postgres-operator.crunchydata.com/role": "master"
	},
	port_forwards='3205:5432') # db