export default function dedupe(mixin) {
  const symbol = Symbol(mixin.name);
  const deduped = function (superclass) {
    if (symbol in superclass) {
      return superclass;
    }
    return class extends mixin(...arguments) {
      static [symbol];
    };
  };
  deduped.extends = (superclass) => symbol in superclass;
  return deduped;
}
