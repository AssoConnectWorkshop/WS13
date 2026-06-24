export interface Contact {
  "@id": string;
  "@type": string;
  type: "person" | "structure";
  firstname?: string;
  lastname: string;
  email?: string;
  landlinePhone?: string;
  mobilePhone?: string;
}
