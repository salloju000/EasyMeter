import { describe, expect, it } from "vitest";
import { sanitizeForFirestore } from "./firebase";

describe("Firebase utilities", () => {
  describe("sanitizeForFirestore", () => {
    it("removes undefined values from objects", () => {
      const input = {
        id: "test",
        name: "John",
        meterId: undefined,
        phone: "1234567890",
        notes: undefined,
        createdAt: "2023-01-01",
      };

      const result = sanitizeForFirestore(input);

      expect(result).toEqual({
        id: "test",
        name: "John",
        phone: "1234567890",
        createdAt: "2023-01-01",
      });
      expect(result).not.toHaveProperty("meterId");
      expect(result).not.toHaveProperty("notes");
    });

    it("preserves null values", () => {
      const input = {
        id: "test",
        name: null,
        meterId: undefined,
      };

      const result = sanitizeForFirestore(input);

      expect(result).toEqual({
        id: "test",
        name: null,
      });
      expect(result).not.toHaveProperty("meterId");
    });

    it("handles empty objects", () => {
      const input = {};
      const result = sanitizeForFirestore(input);
      expect(result).toEqual({});
    });

    it("handles objects with only undefined values", () => {
      const input = {
        a: undefined,
        b: undefined,
      };
      const result = sanitizeForFirestore(input);
      expect(result).toEqual({});
    });
  });
});