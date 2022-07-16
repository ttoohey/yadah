export default function pipe(arg, ...fns) {
  return fns.reduce((val, fn) => fn(val), arg);
}
