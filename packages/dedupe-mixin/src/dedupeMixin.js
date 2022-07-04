export default function dedupeMixin(mixin) {
  const symbol = Symbol(mixin.name);
  const dedupedMixin = function (superclass) {
    if (symbol in superclass) {
      return superclass;
    }
    return class extends mixin(...arguments) {
      static [symbol];
    };
  };
  dedupedMixin.extends = (superclass) => symbol in superclass;
  return dedupedMixin;
}
