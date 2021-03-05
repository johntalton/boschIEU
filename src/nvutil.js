/**
 *
 **/
export class NameValueUtil {
  static toName(value, nvmap) {
    const item = nvmap.find(i => i.value === value);
    if(item === undefined) { throw new Error('unknown nv value ' + value); }
    return item.name;
  }

  static toValue(name, nvmap) {
    const item = nvmap.find(i => i.name === name);
    if(item === undefined) { throw new Error('unknown nv name: ' + name); }
    return item.value;
  }
}
