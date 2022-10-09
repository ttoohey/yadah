import { Model, mixin } from "objection";
import CopyMixin from "@yadah/objection-copy";
import IteratorMixin from "@yadah/objection-iterator";
import ScopeMixin from "@yadah/objection-scope";
import NotUniqueMixin from "./NotUniqueMixin.js";

export default mixin(
  Model,
  CopyMixin,
  IteratorMixin,
  ScopeMixin,
  NotUniqueMixin
);
