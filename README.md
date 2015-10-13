# print-prep
Digicam photo prep for print shops.

### Help
```
printprep [<source>] [<destination>] [<options>]

source          Defaults to current directory
destination     Defaults to the same as source

Options:
-p, --position  Position photo at center, left, or right, defaults to `--position=right`.
-c, --color     Background color, if original photo does not fill up the whole resulting photo, defaults to `--color=white`.
-r, --ratio     Resulting ratio, defaults to `--ratio=3:2`.
-e, --ext       Specify extensions, defaults to `--ext=jpg,jpeg,tiff,png`.
-f, --fillup    Expand to fill up the whole resulting photo, may lose parts of source, defaults to unset (false).
-o, --occupancy Specify the percentage of photo occupancy. Setting this automatically enables `--fillup`.
```

### Notes

- `printprep` always rotate photos to landscape because printers are orientation agnostics.
