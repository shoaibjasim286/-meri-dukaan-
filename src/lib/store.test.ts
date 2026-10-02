import { describe, expect, it } from "vitest";
import { getCustomerPaymentValidationError } from "@/lib/store";

describe("customer payment validation", () => {
  it("rejects payment greater than customer balance", () => {
    expect(getCustomerPaymentValidationError(1000, 500)).toBe(
      "Payment Rs 500 se zyada nahi ho sakti",
    );
  });

  it("allows payment equal to customer balance", () => {
    expect(getCustomerPaymentValidationError(500, 500)).toBeNull();
  });
});
