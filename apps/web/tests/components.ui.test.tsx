import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { Button } from "../src/components/ui/Button";
import { Input } from "../src/components/ui/Input";
import { Badge } from "../src/components/ui/Badge";
import { Avatar, getInitials } from "../src/components/ui/Avatar";
import { RoleBadge } from "../src/components/ui/RoleBadge";
import { EmptyState } from "../src/components/ui/EmptyState";
import { LoadingState } from "../src/components/ui/LoadingState";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../src/components/ui/Table";
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

      rerender(<Badge variant="purple">Purple</Badge>);
      expect(screen.getByText("Purple")).toHaveClass("bg-purple-100", "text-purple-800");
    });

    it("renders optional decorative dot indicator with aria-hidden", () => {
      const { container, rerender } = render(<Badge dot>With Dot</Badge>);
      const dotEl = container.querySelector('span[aria-hidden="true"]');
      expect(dotEl).toBeInTheDocument();
      expect(dotEl).toHaveClass("rounded-full", "bg-current");

      rerender(<Badge>Without Dot</Badge>);
      const noDotEl = container.querySelector('span[aria-hidden="true"]');
      expect(noDotEl).not.toBeInTheDocument();
    });

    it("renders both sm and md sizes correctly", () => {
      const { rerender } = render(<Badge size="sm">Small</Badge>);
      expect(screen.getByText("Small")).toHaveClass("text-xs", "px-2", "py-0.5");

      rerender(<Badge size="md">Medium</Badge>);
      expect(screen.getByText("Medium")).toHaveClass("text-xs", "px-2.5", "py-1");
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

    // 11. Initial focus management
    it("moves focus inside the modal on open (prioritizing autofocus or first focusable element)", () => {
      // With autofocus
      const { unmount } = render(
        <Modal isOpen={true} onClose={() => {}} title="Autofocus Test">
          <input data-testid="regular-input" />
          <button data-testid="autofocus-btn" autoFocus>
            Action
          </button>
        </Modal>
      );
      expect(screen.getByTestId("autofocus-btn")).toHaveFocus();
      unmount();

      // Without autofocus element, focuses the first focusable element (close button)
      render(
        <Modal isOpen={true} onClose={() => {}} title="First Element Focus Test">
          <button data-testid="inner-btn">Inner</button>
        </Modal>
      );
      expect(screen.getByLabelText("Close dialog")).toHaveFocus();
    });

    // 12. Focus trap: Tab key cycles forward from last to first element
    it("traps focus inside the modal when Tab is pressed on the last element", () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Tab Trap Forward">
          <input data-testid="input-1" />
          <button data-testid="btn-last">Last Button</button>
        </Modal>
      );

      const closeBtn = screen.getByLabelText("Close dialog");
      const lastBtn = screen.getByTestId("btn-last");

      lastBtn.focus();
      expect(lastBtn).toHaveFocus();

      // Press Tab on the last element -> should wrap back to first element (closeBtn)
      fireEvent.keyDown(document, { key: "Tab" });
      expect(closeBtn).toHaveFocus();
    });

    // 13. Focus trap: Shift+Tab key cycles backward from first to last element
    it("traps focus inside the modal when Shift+Tab is pressed on the first element", () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Tab Trap Backward">
          <input data-testid="input-1" />
          <button data-testid="btn-last">Last Button</button>
        </Modal>
      );

      const closeBtn = screen.getByLabelText("Close dialog");
      const lastBtn = screen.getByTestId("btn-last");

      closeBtn.focus();
      expect(closeBtn).toHaveFocus();

      // Press Shift+Tab on the first element -> should wrap to last element
      fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
      expect(lastBtn).toHaveFocus();
    });

    // 14. Focus restoration to trigger element on close
    it("restores focus to the triggering element when the modal closes", () => {
      const triggerBtn = document.createElement("button");
      triggerBtn.textContent = "Open Modal Trigger";
      document.body.appendChild(triggerBtn);
      triggerBtn.focus();
      expect(triggerBtn).toHaveFocus();

      const { rerender } = render(
        <Modal isOpen={true} onClose={() => {}} title="Restoration Test">
          <p>Modal Content</p>
        </Modal>
      );

      // Focus should now be inside modal
      expect(screen.getByLabelText("Close dialog")).toHaveFocus();

      // Close modal
      rerender(
        <Modal isOpen={false} onClose={() => {}} title="Restoration Test">
          <p>Modal Content</p>
        </Modal>
      );

      // Focus should be restored back to triggerBtn
      expect(triggerBtn).toHaveFocus();
      document.body.removeChild(triggerBtn);
    });

    // 15. Background content isolation (redirects external focus back to modal)
    it("keeps focus contained when focus attempts to leave the modal", () => {
      const backgroundInput = document.createElement("input");
      backgroundInput.setAttribute("data-testid", "background-input");
      document.body.appendChild(backgroundInput);

      render(
        <Modal isOpen={true} onClose={() => {}} title="Background Isolation">
          <button data-testid="inside-btn">Inside</button>
        </Modal>
      );

      // Attempt to focus background element while modal is open
      backgroundInput.focus();

      // Should immediately redirect focus back into the modal
      expect(screen.getByLabelText("Close dialog")).toHaveFocus();
      document.body.removeChild(backgroundInput);
    });

    // 16. Dismissal controls (closeOnEscape & closeOnBackdropClick)
    it("respects closeOnEscape=false and closeOnBackdropClick=false", () => {
      const handleClose = vi.fn();
      render(
        <Modal
          isOpen={true}
          onClose={handleClose}
          title="Dismissal Disabled Test"
          closeOnEscape={false}
          closeOnBackdropClick={false}
        >
          <div>Content</div>
        </Modal>
      );

      // Escape should not trigger onClose
      fireEvent.keyDown(document, { key: "Escape" });
      expect(handleClose).not.toHaveBeenCalled();

      // Backdrop click should not trigger onClose
      const backdrop = screen.getByTestId("modal-backdrop");
      fireEvent.click(backdrop);
      expect(handleClose).not.toHaveBeenCalled();
    });

    // 17. Body overflow scroll lock and cleanup
    it("locks body overflow when open and restores it upon closing or unmounting", () => {
      document.body.style.overflow = "visible";

      const { rerender, unmount } = render(
        <Modal isOpen={true} onClose={() => {}} title="Scroll Lock Test">
          <div>Content</div>
        </Modal>
      );

      expect(document.body.style.overflow).toBe("hidden");

      rerender(
        <Modal isOpen={false} onClose={() => {}} title="Scroll Lock Test">
          <div>Content</div>
        </Modal>
      );

      expect(document.body.style.overflow).toBe("visible");

      // Verify unmount cleanup as well
      rerender(
        <Modal isOpen={true} onClose={() => {}} title="Scroll Lock Test 2">
          <div>Content</div>
        </Modal>
      );
      expect(document.body.style.overflow).toBe("hidden");
      unmount();
      expect(document.body.style.overflow).toBe("visible");
    });
  });

  // 18. Button component tests
  describe("Button Component", () => {
    it("renders all button variants with corresponding classes", () => {
      const { rerender } = render(<Button variant="primary">Primary</Button>);
      expect(screen.getByRole("button", { name: "Primary" })).toHaveClass("bg-brand-600", "text-white");

      rerender(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole("button", { name: "Secondary" })).toHaveClass("bg-gray-100", "text-gray-800");

      rerender(<Button variant="outline">Outline</Button>);
      expect(screen.getByRole("button", { name: "Outline" })).toHaveClass("border-gray-300", "text-gray-700");

      rerender(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByRole("button", { name: "Ghost" })).toHaveClass("text-gray-600", "hover:bg-gray-100");

      rerender(<Button variant="danger">Danger</Button>);
      expect(screen.getByRole("button", { name: "Danger" })).toHaveClass("bg-red-600", "text-white");
    });

    it("renders all button sizes with corresponding styles", () => {
      const { rerender } = render(<Button size="sm">Small</Button>);
      expect(screen.getByRole("button", { name: "Small" })).toHaveClass("text-xs", "px-3", "py-1.5");

      rerender(<Button size="md">Medium</Button>);
      expect(screen.getByRole("button", { name: "Medium" })).toHaveClass("text-sm", "px-4", "py-2");

      rerender(<Button size="lg">Large</Button>);
      expect(screen.getByRole("button", { name: "Large" })).toHaveClass("text-base", "px-5", "py-2.5");
    });

    it("handles loading state correctly: sets aria-busy, disables button, and shows spinner", () => {
      render(<Button isLoading>Save Changes</Button>);
      const btn = screen.getByRole("button", { name: "Save Changes" });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute("aria-busy", "true");
      expect(btn.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("handles disabled state and prevents click firing", () => {
      const handleClick = vi.fn();
      render(<Button disabled onClick={handleClick}>Disabled Action</Button>);
      const btn = screen.getByRole("button", { name: "Disabled Action" });
      expect(btn).toBeDisabled();
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it("renders leftIcon and rightIcon properly", () => {
      render(
        <Button
          leftIcon={<span data-testid="left-icon">Left</span>}
          rightIcon={<span data-testid="right-icon">Right</span>}
        >
          Icon Button
        </Button>
      );
      expect(screen.getByTestId("left-icon")).toBeInTheDocument();
      expect(screen.getByTestId("right-icon")).toBeInTheDocument();
      expect(screen.getByText("Icon Button")).toBeInTheDocument();
    });

    it("replaces leftIcon with spinner when isLoading is true", () => {
      render(
        <Button
          isLoading
          leftIcon={<span data-testid="left-icon">Left</span>}
          rightIcon={<span data-testid="right-icon">Right</span>}
        >
          Loading Action
        </Button>
      );
      expect(screen.queryByTestId("left-icon")).not.toBeInTheDocument();
      expect(screen.getByRole("button").querySelector(".animate-spin")).toBeInTheDocument();
      expect(screen.getByTestId("right-icon")).toBeInTheDocument();
    });

    it("forwards ref and passes native attributes like type", () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref} type="submit" name="submit-btn">Submit</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current).toHaveAttribute("type", "submit");
      expect(ref.current).toHaveAttribute("name", "submit-btn");
    });
  });

  // 19. Input component tests
  describe("Input Component", () => {
    it("renders visible label associated with input via htmlFor and id", () => {
      render(<Input label="Customer Name" placeholder="Enter name" />);
      const inputEl = screen.getByLabelText("Customer Name");
      expect(inputEl).toBeInTheDocument();
      expect(inputEl).toHaveAttribute("placeholder", "Enter name");
      expect(inputEl.id).toBeTruthy();
    });

    it("supports input without visible label when aria-label is provided", () => {
      render(<Input aria-label="Search tickets" placeholder="Type here..." />);
      const inputEl = screen.getByRole("textbox", { name: "Search tickets" });
      expect(inputEl).toBeInTheDocument();
      expect(screen.queryByText("Search tickets")).not.toBeInTheDocument();
    });

    it("associates error message with aria-describedby and sets aria-invalid='true'", () => {
      render(<Input label="Email" error="Email is required" />);
      const inputEl = screen.getByLabelText("Email");
      expect(inputEl).toHaveAttribute("aria-invalid", "true");
      const errorMsg = screen.getByRole("alert");
      expect(errorMsg).toHaveTextContent("Email is required");
      expect(inputEl).toHaveAttribute("aria-describedby", errorMsg.id);
    });

    it("associates helperText with aria-describedby when no error exists", () => {
      render(<Input label="Username" helperText="Must be at least 3 characters" />);
      const inputEl = screen.getByLabelText("Username");
      expect(inputEl).toHaveAttribute("aria-invalid", "false");
      expect(screen.getByText("Must be at least 3 characters")).toBeInTheDocument();
      expect(inputEl.getAttribute("aria-describedby")).toBeTruthy();
    });

    it("combines error and helperText IDs in aria-describedby when both exist", () => {
      render(
        <Input
          label="Password"
          error="Password too short"
          helperText="Requires 8 characters"
        />
      );
      const inputEl = screen.getByLabelText("Password");
      expect(inputEl).toHaveAttribute("aria-invalid", "true");
      const describedBy = inputEl.getAttribute("aria-describedby") || "";
      expect(describedBy.split(" ").length).toBe(2);
    });

    it("renders leftIcon and rightIcon properly", () => {
      render(
        <Input
          label="Search"
          leftIcon={<span data-testid="input-left-icon">L</span>}
          rightIcon={<span data-testid="input-right-icon">R</span>}
        />
      );
      expect(screen.getByTestId("input-left-icon")).toBeInTheDocument();
      expect(screen.getByTestId("input-right-icon")).toBeInTheDocument();
    });

    it("forwards ref and passes native attributes like type='password'", () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} type="password" name="user_password" />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current).toHaveAttribute("type", "password");
      expect(ref.current).toHaveAttribute("name", "user_password");
    });
  });

  // 20. Avatar component tests
  describe("Avatar Component", () => {
    it("generates correct initials for various name formats", () => {
      expect(getInitials("Jane Doe")).toBe("JD");
      expect(getInitials("Alex")).toBe("A");
      expect(getInitials("Mary Jane Watson")).toBe("MW");
      expect(getInitials("  John   Smith  ")).toBe("JS");
      expect(getInitials("")).toBeNull();
      expect(getInitials("   ")).toBeNull();
      expect(getInitials(null)).toBeNull();
      expect(getInitials(undefined)).toBeNull();
    });

    it("renders initials when valid name is provided", () => {
      render(<Avatar name="Sofia Admin" />);
      const avatarEl = screen.getByRole("img", { name: "Sofia Admin's avatar" });
      expect(avatarEl).toBeInTheDocument();
      expect(screen.getByText("SA")).toBeInTheDocument();
    });

    it("falls back to icon for missing or empty names without throwing", () => {
      const { rerender } = render(<Avatar name="" />);
      expect(screen.getByRole("img", { name: "User avatar" })).toBeInTheDocument();
      expect(document.querySelector(".lucide-user")).toBeInTheDocument();

      rerender(<Avatar name="   " />);
      expect(screen.getByRole("img", { name: "User avatar" })).toBeInTheDocument();

      rerender(<Avatar name={null} />);
      expect(screen.getByRole("img", { name: "User avatar" })).toBeInTheDocument();

      rerender(<Avatar />);
      expect(screen.getByRole("img", { name: "User avatar" })).toBeInTheDocument();
    });

    it("supports all four Avatar sizes (xs, sm, md, lg)", () => {
      const { rerender } = render(<Avatar name="Test User" size="xs" />);
      expect(screen.getByRole("img")).toHaveClass("w-6", "h-6", "text-[10px]");

      rerender(<Avatar name="Test User" size="sm" />);
      expect(screen.getByRole("img")).toHaveClass("w-7", "h-7", "text-xs");

      rerender(<Avatar name="Test User" size="md" />);
      expect(screen.getByRole("img")).toHaveClass("w-8", "h-8", "text-xs");

      rerender(<Avatar name="Test User" size="lg" />);
      expect(screen.getByRole("img")).toHaveClass("w-10", "h-10", "text-sm");
    });

    it("applies role-based styling when role is provided", () => {
      const { rerender } = render(<Avatar name="Admin" role="ADMIN" />);
      expect(screen.getByRole("img")).toHaveClass("bg-purple-100", "text-purple-700");

      rerender(<Avatar name="Agent" role="AGENT" />);
      expect(screen.getByRole("img")).toHaveClass("bg-blue-100", "text-blue-700");

      rerender(<Avatar name="Customer" role="CUSTOMER" />);
      expect(screen.getByRole("img")).toHaveClass("bg-emerald-100", "text-emerald-700");

      rerender(<Avatar name="Default" />);
      expect(screen.getByRole("img")).toHaveClass("bg-brand-100", "text-brand-700");
    });

    it("supports custom accessible label override", () => {
      render(<Avatar name="Alex" label="Profile photo for Alex" />);
      expect(screen.getByRole("img", { name: "Profile photo for Alex" })).toBeInTheDocument();
    });
  });

  // 21. RoleBadge component tests
  describe("RoleBadge Component", () => {
    it("renders ADMIN role with purple variant and default test ID", () => {
      render(<RoleBadge role="ADMIN" />);
      const badge = screen.getByTestId("role-badge-admin");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("ADMIN");
      expect(badge).toHaveClass("bg-purple-100", "text-purple-800", "border-purple-200");
    });

    it("renders AGENT role with brand variant and default test ID", () => {
      render(<RoleBadge role="AGENT" />);
      const badge = screen.getByTestId("role-badge-agent");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("AGENT");
      expect(badge).toHaveClass("bg-brand-50", "text-brand-700", "border-brand-200");
    });

    it("renders CUSTOMER role with success variant and default test ID", () => {
      render(<RoleBadge role="CUSTOMER" />);
      const badge = screen.getByTestId("role-badge-customer");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("CUSTOMER");
      expect(badge).toHaveClass("bg-emerald-50", "text-emerald-700", "border-emerald-200");
    });

    it("supports format='capitalize' for title-case display", () => {
      render(<RoleBadge role="ADMIN" format="capitalize" />);
      expect(screen.getByTestId("role-badge-admin")).toHaveTextContent("Admin");
    });

    it("renders shield icon when showIcon is true", () => {
      render(<RoleBadge role="ADMIN" showIcon />);
      const shieldIcon = document.querySelector(".lucide-shield");
      expect(shieldIcon).toBeInTheDocument();
      expect(shieldIcon).toHaveAttribute("aria-hidden", "true");
    });

    it("handles unexpected or unknown role values safely with neutral fallback", () => {
      render(<RoleBadge role="UNKNOWN_ROLE" />);
      const badge = screen.getByTestId("role-badge-unknown_role");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("UNKNOWN_ROLE");
      expect(badge).toHaveClass("bg-gray-100", "text-gray-700", "border-gray-200");
    });

    it("allows custom data-testid override for compatibility with existing tests", () => {
      render(<RoleBadge role="AGENT" data-testid="comment-role-agent" />);
      expect(screen.getByTestId("comment-role-agent")).toBeInTheDocument();
    });
  });

  // 22. EmptyState component tests
  describe("EmptyState Component", () => {
    it("renders title and description properly", () => {
      render(
        <EmptyState
          title="No Tickets Found"
          description="There are currently no tickets matching your query."
        />
      );
      expect(screen.getByRole("heading", { level: 3, name: "No Tickets Found" })).toBeInTheDocument();
      expect(screen.getByText("There are currently no tickets matching your query.")).toBeInTheDocument();
    });

    it("renders with and without icon cleanly", () => {
      const { rerender } = render(
        <EmptyState
          title="With Icon"
          icon={<span data-testid="empty-icon">Icon</span>}
        />
      );
      expect(screen.getByTestId("empty-icon")).toBeInTheDocument();

      rerender(<EmptyState title="Without Icon" />);
      expect(screen.queryByTestId("empty-icon")).not.toBeInTheDocument();
      expect(screen.getByText("Without Icon")).toBeInTheDocument();
    });

    it("renders optional action button/slot", () => {
      render(
        <EmptyState
          title="Action Test"
          action={<button data-testid="empty-action-btn">Create Ticket</button>}
        />
      );
      expect(screen.getByTestId("empty-action-btn")).toBeInTheDocument();
    });

    it("supports dashed and normal (non-dashed) presentation", () => {
      const { container, rerender } = render(<EmptyState title="Dashed State" isDashed={true} />);
      expect(container.firstChild).toHaveClass("border-dashed", "border-2");

      rerender(<EmptyState title="Normal State" isDashed={false} />);
      expect(container.firstChild).not.toHaveClass("border-dashed");
    });

    it("forwards data-testid to container", () => {
      render(<EmptyState title="Test" data-testid="ticket-list-empty" />);
      expect(screen.getByTestId("ticket-list-empty")).toBeInTheDocument();
    });
  });

  // 23. LoadingState component tests
  describe("LoadingState Component", () => {
    it("renders default loading message and custom message", () => {
      const { rerender } = render(<LoadingState />);
      expect(screen.getByText("Loading...")).toBeInTheDocument();

      rerender(<LoadingState message="Fetching ticket records..." />);
      expect(screen.getByText("Fetching ticket records...")).toBeInTheDocument();
    });

    it("supports all three sizes: sm, md, and lg", () => {
      const { container, rerender } = render(<LoadingState size="sm" />);
      expect(container.firstChild).toHaveClass("py-8");

      rerender(<LoadingState size="md" />);
      expect(container.firstChild).toHaveClass("py-16");

      rerender(<LoadingState size="lg" />);
      expect(container.firstChild).toHaveClass("py-20");
    });

    it("implements accessibility: role='status' and aria-live='polite'", () => {
      render(<LoadingState message="Loading data" />);
      const statusEl = screen.getByRole("status");
      expect(statusEl).toBeInTheDocument();
      expect(statusEl).toHaveAttribute("aria-live", "polite");
      expect(statusEl).toHaveTextContent("Loading data");
    });

    it("ensures decorative spinner has aria-hidden='true'", () => {
      const { container } = render(<LoadingState />);
      const spinner = container.querySelector(".lucide-loader-2, .animate-spin");
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute("aria-hidden", "true");
    });

    it("forwards data-testid to container and supports asCard=false", () => {
      const { container } = render(
        <LoadingState data-testid="custom-loading" asCard={false} />
      );
      expect(screen.getByTestId("custom-loading")).toBeInTheDocument();
      // without card wrapper, it does not have shadow-sm or bg-white from Card
      expect(container.querySelector(".rounded-xl")).not.toBeInTheDocument();
    });
  });

  // 24. Table component tests
  describe("Table Component", () => {
    it("renders semantic table structure with header, body, rows, and cells", () => {
      render(
        <Table data-testid="test-table">
          <TableHeader>
            <TableRow>
              <TableHead>Col 1</TableHead>
              <TableHead>Col 2</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Row 1 Cell 1</TableCell>
              <TableCell>Row 1 Cell 2</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getAllByRole("columnheader")).toHaveLength(2);
      expect(screen.getAllByRole("row")).toHaveLength(2); // 1 in thead, 1 in tbody
      expect(screen.getAllByRole("cell")).toHaveLength(2);
      expect(screen.getByText("Col 1")).toBeInTheDocument();
      expect(screen.getByText("Row 1 Cell 1")).toBeInTheDocument();
    });

    it("verifies correct semantic HTML elements", () => {
      const { container } = render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Data</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(container.querySelector("table")).toBeInTheDocument();
      expect(container.querySelector("thead")).toBeInTheDocument();
      expect(container.querySelector("tbody")).toBeInTheDocument();
      expect(container.querySelector("tr")).toBeInTheDocument();
      expect(container.querySelector("th")).toBeInTheDocument();
      expect(container.querySelector("td")).toBeInTheDocument();
    });

    it("renders multiple rows and cells correctly", () => {
      render(
        <Table>
          <TableBody>
            <TableRow data-testid="row-1">
              <TableCell>1A</TableCell>
              <TableCell>1B</TableCell>
            </TableRow>
            <TableRow data-testid="row-2">
              <TableCell>2A</TableCell>
              <TableCell>2B</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByTestId("row-1")).toBeInTheDocument();
      expect(screen.getByTestId("row-2")).toBeInTheDocument();
      expect(screen.getAllByRole("cell")).toHaveLength(4);
    });

    it("includes horizontal overflow wrapper with overflow-x-auto", () => {
      const { container } = render(
        <Table containerClassName="custom-container">
          <TableBody>
            <TableRow>
              <TableCell>Content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("overflow-x-auto", "custom-container");
    });

    it("ensures TableHead has scope='col' by default for accessibility", () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Accessible Column Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );

      const th = screen.getByRole("columnheader", { name: "Accessible Column Header" });
      expect(th).toHaveAttribute("scope", "col");
    });

    it("handles clickable rows with click and keyboard accessibility (Enter and Space)", () => {
      const handleClick = vi.fn();
      render(
        <Table>
          <TableBody>
            <TableRow isClickable onClick={handleClick} data-testid="clickable-row">
              <TableCell>Clickable Content</TableCell>
            </TableRow>
            <TableRow data-testid="regular-row">
              <TableCell>Regular Content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const clickableRow = screen.getByTestId("clickable-row");
      const regularRow = screen.getByTestId("regular-row");

      // Clickable row styles and tabIndex
      expect(clickableRow).toHaveClass("cursor-pointer");
      expect(clickableRow).toHaveAttribute("tabindex", "0");
      expect(regularRow).not.toHaveClass("cursor-pointer");

      // Mouse click trigger
      fireEvent.click(clickableRow);
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Keyboard: Enter key trigger
      fireEvent.keyDown(clickableRow, { key: "Enter" });
      expect(handleClick).toHaveBeenCalledTimes(2);

      // Keyboard: Space key trigger
      fireEvent.keyDown(clickableRow, { key: " " });
      expect(handleClick).toHaveBeenCalledTimes(3);

      // Non-action keys should not trigger onClick
      fireEvent.keyDown(clickableRow, { key: "ArrowDown" });
      expect(handleClick).toHaveBeenCalledTimes(3);
    });

    it("supports custom classNames on all compound subcomponents", () => {
      const { container } = render(
        <Table className="custom-table">
          <TableHeader className="custom-header">
            <TableRow className="custom-row">
              <TableHead className="custom-head">H</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="custom-body">
            <TableRow className="custom-row-2">
              <TableCell className="custom-cell">D</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(container.querySelector(".custom-table")).toBeInTheDocument();
      expect(container.querySelector(".custom-header")).toBeInTheDocument();
      expect(container.querySelector(".custom-body")).toBeInTheDocument();
      expect(container.querySelector(".custom-row")).toBeInTheDocument();
      expect(container.querySelector(".custom-head")).toBeInTheDocument();
      expect(container.querySelector(".custom-cell")).toBeInTheDocument();
    });
  });
});
