import OrderScopeMixin_ from "./OrderScopeMixin.js";
import PagingScopeMixin_ from "./PagingScopeMixin.js";
export ScopeMixin from "./ScopeMixin.js";
export const OrderScopeMixin = OrderScopeMixin_;
export const PagingScopeMixin = PagingScopeMixin_;
export default (Model) => Model |> OrderScopeMixin(%) |> PagingScopeMixin(%);
