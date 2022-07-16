export default class NotUniqueError extends Error {
  type = "NotUnique";
  statusCode = 400;
  constructor(length) {
    super(`Expected one result, found ${length}`);
  }
}
