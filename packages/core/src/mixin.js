export default function mixin(superclass, ...mixins) {
  return mixins
    .flat()
    .reduce((superclass, mixin) => mixin(superclass), superclass);
}
