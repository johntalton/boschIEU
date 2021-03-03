//export type NameValueKey = string|number|boolean;
//export type NameValueMap = { name: NameValueKey, value: NameValueKey }[];

/**
 *
 **/
export class NameValueUtil {
  static toName(value/*: NameValueKey*/, nvmap/*: NameValueMap*/)/*: NameValueKey*/ {
    const item = nvmap.find(i => i.value === value);
    if(item === undefined) { throw new Error('unknown nv value ' + value); }
    return item.name;
  }

  static toValue(name/*: NameValueKey*/, nvmap/*: NameValueMap*/)/*: NameValueKey*/ {
    const item = nvmap.find(i => i.name === name);
    if(item === undefined) { throw new Error('unknown nv name: ' + name); }
    return item.value;
  }
}
