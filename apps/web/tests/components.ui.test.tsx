import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Badge } from "../src/components/ui/Badge";
import { Select } from "../src/components/ui/Select";
import { Textarea } from "../src/components/ui/Textarea";
import { Modal } from "../src/components/ui/Modal";
import { StatusBadge } from "../src/features/tickets/components/StatusBadge";
import { PriorityBadge } from "../src/features/tickets/components/PriorityBadge";
import type { TicketStatus, TicketPriority } from "../src/features/tickets/types";

describe("Reusable UI Components (Stage 3)", () => {
  // 1. Badge variants
  describe("Badge Component", () => {
    it("renders all badge variants with corresponding visual styling", () => {
      const { rerender } = render(<Badge variant="neutral">Neutral</Badge>);
      expect(screen.getByText("Neutral")).toHaveClass("bg-gray-100", "text-gray-700");

      rerender(<Badge variant="success">Success</Badge>);
      expect(screen.getByText("Success")).toHaveClass("bg-emerald-50", "text-emerald-700");

      rerender(<Badge variant="warning">Warning</Badge>);
      expect(screen.getByText("Warning")).toHaveClass("bg-amber-50", "text-amber-800");

      rerender(<Badge variant="danger">Danger</Badge>);
      expect(screen.getByText("Danger")).toHaveClass("bg-red-50", "text-red-700");

      rerender(<Badge variant="brand">Brand</Badge>);
      expect(screen.getByText("Brand")).toHaveClass("bg-brand-50", "text-brand-700");
    });
  });

  // 2. All five ticket statuses
  describe("StatusBadge Component", () => {
    const statuses: { status: TicketStatus; label: string }[] = [
      { status: "OPEN", label: "Open" },
      { status: "IN_PROGRESS", label: "In Progress" },
      { status: "WAITING_ON_CUSTOMER", label: "Waiting on Customer" },
      { status: "RESOLVED", label: "Resolved" },
      { status: "CLOSED", label: "Closed" },
    ];

    statuses.forEach(({ status, label }) => {
      it(`renders correctly for status ${status}`, () => {
        render(<StatusBadge status={status} />);
        expect(screen.getByText(label)).toBeInTheDocument();
        expect(
          screen.getByTestId(`status-badge-${status.toLowerCase()}`)
        ).toBeInTheDocument();
      });
    });
  });

  // 3. All four priority values
  describe("PriorityBadge Component", () => {
    const priorities: { priority: TicketPriority; label: string }[] = [
      { priority: "P1", label: "P1 — Critical" },
      { priority: "P2", label: "P2 — High" },
      { priority: "P3", label: "P3 — Medium" },
      { priority: "P4", label: "P4 — Low" },
    ];

    priorities.forEach(({ priority, label }) => {
      it(`renders correctly for priority ${priority}`, () => {
        render(<PriorityBadge priority={priority} />);
        expect(screen.getByText(label)).toBeInTheDocument();
        expect(
          screen.getByTestId(`priority-badge-${priority.toLowerCase()}`)
        ).toBeInTheDocument();
      });
    });
  });

  // 4. Select label and error rendering
  describe("Select Component", () => {
    it("renders label, options, and error with accessible attributes", () => {
      const options = [
        { value: "opt1", label: "Option 1" },
        { value: "opt2", label: "Option 2" },
      ];

      render(
        <Select
          label="Ticket Priority"
          options={options}
          error="Priority selection is required"
        />
      );

      expect(screen.getByLabelText("Ticket Priority")).toBeInTheDocument();
      expect(screen.getByText("Priority selection is required")).toBeInTheDocument();
      const selectEl = screen.getByRole("combobox");
      expect(selectEl).toHaveAttribute("aria-invalid", "true");
    });

    // 5. Select disabled behavior
    it("respects disabled state properly", () => {
      render(
        <Select
          label="Assignee"
          options={[{ value: "1", label: "Agent 1" }]}
          disabled
        />
      );

      const selectEl = screen.getByRole("combobox");
      expect(selectEl).toBeDisabled();
      expect(selectEl).toHaveClass("disabled:cursor-not-allowed");
    });
  });

  // 6. Textarea label and error rendering
  describe("Textarea Component", () => {
    it("renders label, placeholder, and error message with aria-invalid", () => {
      render(
        <Textarea
          label="Description"
          placeholder="Enter detailed issue..."
          error="Description must be at least 5 characters"
        />
      );

      expect(screen.getByLabelText("Description")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter detailed issue...")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Description must be at least 5 characters")
      ).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    });

    // 7. Character count
    it("updates character counter dynamically when typing with maxLength", () => {
      render(
        <Textarea
          label="Message"
          maxLength={100}
          showCount
          defaultValue="Hello"
        />
      );

      const counter = screen.getByTestId("textarea-char-count");
      expect(counter).toHaveTextContent("5/100");

      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, { target: { value: "Hello World!" } });
      expect(counter).toHaveTextContent("12/100");
    });
  });

  // 8. Modal open/close behavior
  describe("Modal Component", () => {
    it("renders when isOpen is true and unmounts when isOpen is false", () => {
      const handleClose = vi.fn();
      const { rerender } = render(
        <Modal isOpen={true} onClose={handleClose} title="Create New Ticket">
          <p>Modal body content</p>
        </Modal>
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Create New Ticket")).toBeInTheDocument();
      expect(screen.getByText("Modal body content")).toBeInTheDocument();

      // Click close button
      const closeBtn = screen.getByLabelText("Close dialog");
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);

      // Click backdrop
      const backdrop = screen.getByTestId("modal-backdrop");
      fireEvent.click(backdrop);
      expect(handleClose).toHaveBeenCalledTimes(2);

      // Rerender with isOpen=false
      rerender(
        <Modal isOpen={false} onClose={handleClose} title="Create New Ticket">
          <p>Modal body content</p>
        </Modal>
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // 9. Escape-key handling
    it("calls onClose when Escape key is pressed", () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Escape Test">
          <div>Content</div>
        </Modal>
      );

      fireEvent.keyDown(document, { key: "Escape" });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    // 10. Modal accessibility attributes
    it("implements required dialog accessibility attributes", () => {
      render(
        <Modal
          isOpen={true}
          onClose={() => {}}
          title="Accessible Dialog"
          description="Description for screen readers"
        >
          <div>Content</div>
        </Modal>
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby");
      expect(dialog).toHaveAttribute("aria-describedby");
    });
  });
});
