/**
 * Emails are queued in email_outbox and previewed by staff.
 * The only shipped sender is disabled. It never contacts a provider.
 * A real provider would implement EmailSender, keep credentials in a worker
 * secret, and still require an explicit enable flag. See the README.
 */

export interface OutboundEmail {
  to: string;
  subject: string;
  body: string;
}

export interface EmailSender {
  readonly name: string;
  send(email: OutboundEmail): Promise<void>;
}

export const disabledEmailSender: EmailSender = {
  name: "disabled",
  async send(): Promise<void> {
    throw new Error("email delivery is disabled");
  },
};

export function dispatchEmail(
  _email: OutboundEmail,
  options: { enabled: boolean; sender: EmailSender } = { enabled: false, sender: disabledEmailSender },
): "queued" {
  if (options.enabled && options.sender.name !== "disabled") {
    // No enabled sender ships with this worker. This branch is the seam.
    return "queued";
  }
  return "queued";
}

export function thankYouEmail(input: { email: string; contactName: string; farmName: string }): OutboundEmail {
  const name = first(input.contactName);
  return {
    to: input.email,
    subject: "thank you for applying to mainz",
    body: `hi ${name}.\n\nthank you for applying. we have ${input.farmName}. a person at mainz will read it. you do not need to do anything else right now.\n\nmainz`,
  };
}

export function statusEmail(input: {
  email: string;
  contactName: string;
  farmName: string;
  status: "received" | "in_review" | "approved" | "needs_info" | "declined";
}): OutboundEmail {
  const name = first(input.contactName);
  const copy: Record<typeof input.status, { subject: string; line: string }> = {
    received: {
      subject: "we received your mainz application",
      line: `we received the application for ${input.farmName}.`,
    },
    in_review: {
      subject: "your mainz application is in review",
      line: `the application for ${input.farmName} is in review. a person is reading it.`,
    },
    approved: {
      subject: "your mainz application is approved",
      line: `${input.farmName} is approved. a person from mainz will be in touch about how you want to be reached.`,
    },
    needs_info: {
      subject: "we need a little more info",
      line: `we need a little more info before we can finish the application for ${input.farmName}. reply to this note when you can.`,
    },
    declined: {
      subject: "about your mainz application",
      line: `we are not able to move forward with ${input.farmName} right now. thank you for writing to us.`,
    },
  };
  const chosen = copy[input.status];
  return {
    to: input.email,
    subject: chosen.subject,
    body: `hi ${name}.\n\n${chosen.line}\n\nmainz`,
  };
}

export function magicLinkEmail(input: { email: string; contactName: string; url: string }): OutboundEmail {
  const name = first(input.contactName);
  return {
    to: input.email,
    subject: "your mainz sign-in link",
    body: `hi ${name}.\n\nthis link signs you in. there is no password. it expires in 7 days.\n\n${input.url}\n\nmainz`,
  };
}

function first(name: string): string {
  return (name.trim().split(/\s+/)[0] || "there").toLowerCase();
}
