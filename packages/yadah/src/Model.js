import { Model } from "objection";
import ScopeMixin from "@yadah/objection-scope";
import IteratorMixin from "@yadah/objection-iterator";

export default Model |> ScopeMixin(%) |> IteratorMixin(%);
