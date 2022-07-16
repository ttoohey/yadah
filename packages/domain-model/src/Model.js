import { Model, mixin } from "objection";
import ScopeMixin from "@yadah/objection-scope";
import IteratorMixin from "@yadah/objection-iterator";
import NotUniqueMixin from "./NotUniqueMixin.js";

export default mixin(Model, ScopeMixin, IteratorMixin, NotUniqueMixin);
