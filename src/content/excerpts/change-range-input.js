Cypress.Commands.add("changeRangeInput", (selector, value) => {
  const inputSet = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  ).set;

  return cy.get(selector).then(($input) => {
    inputSet.call($input[0], value);
    $input[0].dispatchEvent(
      new Event("input", { bubbles: true })
    );
    $input[0].dispatchEvent(
      new Event("change", { bubbles: true })
    );
  });
});
