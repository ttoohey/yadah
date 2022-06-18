import { mixin } from "objection";
import ScopeMixin from "./ScopeMixin.js";
import PagingScope from "./PagingScope.js";
import OrderScope from "./OrderScope.js";

export default (Model) =>
  class extends mixin(Model, [ScopeMixin, PagingScope, OrderScope]) {};
