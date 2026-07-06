## Instructions to install driver

```bash
sudo apt update
sudo apt install usb-modeswitch
sudo usb_modeswitch -v a69c -p 5723 -KQ
sudo apt install build-essential linux-headers-$(uname -r)
sudo dpkg -i ax900-wifi-adapter-linux-driver.deb
```

