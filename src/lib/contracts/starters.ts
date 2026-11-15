/**
 * Starter templates a business can copy and change. They are a starting
 * point in plain language, not legal advice: the app says so wherever they
 * are offered, and never claims they have been reviewed by a lawyer.
 */
import type { Database } from "@/lib/supabase/database.types";

export type ContractKind = Database["public"]["Enums"]["contract_kind"];

export type StarterTemplate = {
  key: string;
  kind: ContractKind;
  name: string;
  summary: string;
  body: string;
};

export const STARTER_NOTE =
  "Starter templates are written in plain language to help you begin. They are not legal advice. Have a lawyer check your final version, especially salary, notice and ending-employment terms.";

const employmentContract = `# Contract of Employment

This contract is between **{{Business name}}** of {{Business address}} ("the Business") and **{{Staff name}}** of {{Staff home address}} ("the Staff Member").

## 1. Job
The Staff Member is employed as **{{Job title}}** on a {{Employment type}} basis and reports to {{Reports to}}. The main duties are set out in the job description the Business shares with the Staff Member, which may be updated from time to time as the business changes.

## 2. Start date and probation
Employment starts on **{{Start date}}**. The first {{Probation period}} is a probation period. During probation, either side may end this contract by giving one week's notice in writing.

## 3. Place of work
The Staff Member works at the {{Branch}} branch, or at another place of business the Business reasonably asks them to work from.

## 4. Working hours
Normal working hours are {{Working hours}}, {{Working days}}. The Staff Member may sometimes be asked to work extra hours when the business needs it.

## 5. Salary
The Business pays a monthly salary of **{{Monthly salary}}**, paid on or before the last working day of each month into the bank account the Staff Member provides. Any deductions required by law (such as tax and pension contributions) are made from the salary.

## 6. Leave
The Staff Member is entitled to {{Annual leave days}} working days of paid annual leave each year, in addition to public holidays. Leave is requested in advance and agreed with the Business.

## 7. Sick leave
If the Staff Member is ill and cannot work, they must tell the Business as early as possible on the first day. The Business may ask for a medical certificate for absences of more than two days.

## 8. Conduct and business rules
The Staff Member agrees to follow the Business's rules and policies, to treat customers and colleagues with respect, and to take good care of the Business's property, money and stock.

## 9. Confidential information
The Staff Member must not share the Business's confidential information (such as customer details, prices, suppliers and financial information) with anyone outside the Business, during or after employment.

## 10. Ending this contract
After probation, either side may end this contract by giving **{{Notice period}}** notice in writing, or salary instead of notice. The Business may end this contract without notice for serious misconduct, such as theft, fraud or violence. On leaving, the Staff Member returns all property belonging to the Business.

## 11. Changes to this contract
Any change to this contract is made in writing and agreed by both sides.

## 12. Agreement
By signing, both sides confirm they have read and agree to this contract.
`;

const confidentiality = `# Confidentiality Agreement

This agreement is between **{{Business name}}** ("the Business") and **{{Staff name}}**, {{Job title}} ("the Staff Member").

## 1. What is confidential
Confidential information means any information about the Business that is not public, including customer and supplier details, prices and costs, sales figures, recipes or methods, plans, passwords and staff information.

## 2. What the Staff Member agrees to
- Use confidential information only to do their job for the Business.
- Not share it with anyone outside the Business, including on WhatsApp, social media or by phone.
- Not copy, photograph or take it away, except as their job needs.
- Return or delete all confidential information when they leave or when the Business asks.

## 3. How long this lasts
This agreement applies during employment and continues after the Staff Member leaves the Business.

## 4. Agreement
By signing, both sides confirm they have read and agree to this agreement.
`;

const handbook = `# Staff Handbook Acknowledgement

I, **{{Staff name}}**, confirm that I have received and read the staff handbook of **{{Business name}}**.

I understand the rules and policies it describes, including working hours, attendance, leave, conduct, use of business property and confidentiality, and I agree to follow them.

I understand that the Business may update its rules and policies, and that it will tell me when it does.

If I have any questions about the handbook, I will ask my manager or the business owner.
`;

const rules = `# Workplace Rules Acknowledgement

I, **{{Staff name}}**, working as {{Job title}} at the {{Branch}} branch of **{{Business name}}**, confirm that I have been told about and understand these workplace rules:

- Arrive on time and tell my manager as early as possible if I will be late or absent.
- Handle cash, stock and business property honestly and carefully.
- Treat customers and colleagues with respect.
- Keep the workplace clean and safe, and report any danger or accident straight away.
- Do not share business information outside the Business.

I agree to follow these rules.
`;

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    key: "employment_contract",
    kind: "contract",
    name: "Contract of employment",
    summary: "Job, start date, probation, hours, salary, leave, conduct and notice.",
    body: employmentContract,
  },
  {
    key: "confidentiality",
    kind: "contract",
    name: "Confidentiality agreement",
    summary: "Keeps customer, supplier and price information inside the business.",
    body: confidentiality,
  },
  {
    key: "handbook_acknowledgement",
    kind: "policy",
    name: "Staff handbook acknowledgement",
    summary: "Staff confirm they have read and will follow your staff handbook.",
    body: handbook,
  },
  {
    key: "workplace_rules",
    kind: "policy",
    name: "Workplace rules acknowledgement",
    summary: "Staff confirm your everyday rules: punctuality, cash, conduct and safety.",
    body: rules,
  },
];

export function starterTemplate(key: string): StarterTemplate | undefined {
  return STARTER_TEMPLATES.find((t) => t.key === key);
}

/** A starting layout for a new job description. */
export const JOB_DESCRIPTION_STARTER = `## Purpose of the job
One or two sentences on why this job exists and what success looks like.

## Main duties
-
-
-

## Reports to
Who this person reports to.

## Working hours and location
Normal hours, days and branch.

## Skills and experience
-
`;
