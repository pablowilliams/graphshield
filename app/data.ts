export type NodeKind = "account" | "device" | "ip" | "customer";
export type DemoNode = { id: string; label: string; kind: NodeKind; risk?: string; score?: number; group?: number; x: number; y: number };
export type DemoEdge = { source: string; target: string; type: "TRANSFERRED_TO" | "USED" | "CONNECTED_FROM"; amount?: number };

export const tables = [
  { name: "accounts", rows: "3,000", columns: 5, quality: 100, fields: ["account_id", "customer_id", "opened_at", "status", "risk_band"] },
  { name: "transfers", rows: "25,000", columns: 7, quality: 99.3, fields: ["transfer_id", "sender_id", "recipient_id", "amount", "currency", "occurred_at"] },
  { name: "account_devices", rows: "4,000", columns: 3, quality: 98.9, fields: ["account_id", "device_id", "last_seen"] },
  { name: "ip_events", rows: "8,000", columns: 3, quality: 99.7, fields: ["account_id", "ip_hash", "occurred_at"] },
];

export const nodes: DemoNode[] = [
  { id: "A-1047", label: "A-1047", kind: "account", risk: "High", score: .091, group: 17, x: 49, y: 46 },
  { id: "A-2091", label: "A-2091", kind: "account", risk: "High", score: .078, group: 17, x: 33, y: 28 },
  { id: "A-8832", label: "A-8832", kind: "account", risk: "Medium", score: .064, group: 17, x: 66, y: 26 },
  { id: "A-4120", label: "A-4120", kind: "account", risk: "Low", score: .059, group: 17, x: 76, y: 51 },
  { id: "A-7314", label: "A-7314", kind: "account", risk: "Medium", score: .052, group: 17, x: 62, y: 72 },
  { id: "A-3328", label: "A-3328", kind: "account", risk: "High", score: .047, group: 17, x: 36, y: 75 },
  { id: "D-044", label: "D-044", kind: "device", group: 17, x: 19, y: 50 },
  { id: "D-109", label: "D-109", kind: "device", group: 17, x: 83, y: 78 },
  { id: "IP-77", label: "IP-77", kind: "ip", group: 17, x: 50, y: 88 },
  { id: "A-5502", label: "A-5502", kind: "account", risk: "Low", score: .033, group: 42, x: 91, y: 29 },
];

export const edges: DemoEdge[] = [
  { source: "A-1047", target: "A-2091", type: "TRANSFERRED_TO", amount: 12400 },
  { source: "A-2091", target: "A-8832", type: "TRANSFERRED_TO", amount: 9800 },
  { source: "A-8832", target: "A-4120", type: "TRANSFERRED_TO", amount: 11150 },
  { source: "A-4120", target: "A-7314", type: "TRANSFERRED_TO", amount: 7600 },
  { source: "A-7314", target: "A-3328", type: "TRANSFERRED_TO", amount: 8750 },
  { source: "A-3328", target: "A-1047", type: "TRANSFERRED_TO", amount: 10200 },
  { source: "A-2091", target: "D-044", type: "USED" },
  { source: "A-3328", target: "D-044", type: "USED" },
  { source: "A-4120", target: "D-109", type: "USED" },
  { source: "A-7314", target: "D-109", type: "USED" },
  { source: "A-1047", target: "IP-77", type: "CONNECTED_FROM" },
  { source: "A-8832", target: "IP-77", type: "CONNECTED_FROM" },
  { source: "A-5502", target: "A-4120", type: "TRANSFERRED_TO", amount: 22500 },
];

export const results = [
  { rank: 1, id: "A-1047", group: 17, size: 9, infrastructure: 3, risk: "High", reason: "Circular transfers and a shared IP address" },
  { rank: 2, id: "A-2091", group: 17, size: 9, infrastructure: 3, risk: "High", reason: "Shared device links two high-risk accounts" },
  { rank: 3, id: "A-8832", group: 17, size: 9, infrastructure: 3, risk: "Medium", reason: "Receives from and sends to ring members" },
  { rank: 4, id: "A-3328", group: 17, size: 9, infrastructure: 3, risk: "High", reason: "Closes transfer cycle and shares device" },
  { rank: 5, id: "A-4120", group: 17, size: 9, infrastructure: 3, risk: "Low", reason: "Bridge to external account A-5502" },
  { rank: 6, id: "A-7314", group: 17, size: 9, infrastructure: 3, risk: "Medium", reason: "Shared device and circular transfer pattern" },
];

export const runHistory = [
  { id: "run_f7a91c", project: "September card network", algorithm: "WCC", status: "Succeeded", duration: "8.4s", time: "Today, 14:32" },
  { id: "run_22bd10", project: "September card network", algorithm: "PageRank", status: "Succeeded", duration: "11.7s", time: "Today, 13:08" },
  { id: "run_8c031e", project: "August device review", algorithm: "Shortest path", status: "Failed", duration: "2.1s", time: "Yesterday, 16:44" },
  { id: "run_a2c930", project: "August device review", algorithm: "WCC", status: "Cancelled", duration: "4.8s", time: "Yesterday, 15:12" },
];
