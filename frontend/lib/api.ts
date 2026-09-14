const API_URL = "http://127.0.0.1:8000";

export interface RunCaseResponse {
  mode: string;
  case: {
    case_id: string;
    timeline?: unknown[];
    evidence?: Record<string, unknown>;
    [key: string]: unknown;
  };
  final_action: string;
  explanation: string[] | unknown;
  independent_results?: unknown[];
}

export async function runPayShieldCase(
  caseId: string,
  script: Record<string, unknown>[],
  correlated: boolean = true
): Promise<RunCaseResponse> {
  const response = await fetch(
    `${API_URL}/cases/${caseId}/run`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        script,
        correlated,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      error || "PayShield backend request failed"
    );
  }

  return response.json();
}