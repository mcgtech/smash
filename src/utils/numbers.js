export function isItNumber(str) {
  return /^\-?[0-9]+(e[0-9]+)?(\.[0-9]+)?$/.test(str);
}

// returns string as float or defaultVal
export function strToFloat(val, defaultVal)
{
    // get last char as if its "." and remove it then we need to add back on
    const lastChar = val.substr(-1)
    if (lastChar === ".")
        val = val.substring(0, val.length - 1)
    // if not a float then set to 0
    if (!isItNumber(val))
        val = defaultVal
    // remove leading zeros
    val = parseFloat(val)
    // convert back to string so we can add period back on if necessary
    val = val + ""
    // add . back in
    if (lastChar === ".")
        val = val + "."
    return val
}