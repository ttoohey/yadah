import { pipe } from "@yadah/mixin";
import OrderScopeMixin from "./OrderScopeMixin.js";
import PagingScopeMixin from "./PagingScopeMixin.js";
import ScopeMixin from "./ScopeMixin.js";
export { ScopeMixin, OrderScopeMixin, PagingScopeMixin };
export default (Model) => pipe(Model, OrderScopeMixin, PagingScopeMixin);
