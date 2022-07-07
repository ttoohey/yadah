import { Model } from "objection";
import ScopeMixin from "@yadah/objection-scope";
import IteratorMixin from "@yadah/objection-iterator";
import { NotUniqueMixin } from "@yadah/service-model";

export default Model |> ScopeMixin(%) |> IteratorMixin(%) |> NotUniqueMixin(%);
