"use client";

import { useState, useEffect } from "react";
import Papa from "papaparse";

type CsvRow = {
  content?: string;
  schedule_time?: string;
  image_url?: string;
};

type ValidationResult = {
  valid: boolean;
  errors: string[];
};

type SocialAccount = {
  id: number;
  account_name: string;
  platform: string;
};

export default function BulkUploadPage() {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [validations, setValidations] = useState<ValidationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [importErrors, setImportErrors] = useState<
    {
      row: number;
      error: string;
    }[]
  >([]);
  useEffect(() => {
    async function loadAccounts() {
      try {
        const response = await fetch("/api/accounts");

        const data = await response.json();

        setAccounts(data);
        setSelectedAccounts(data.map((a: SocialAccount) => a.id));
      } catch (error) {
        console.error(error);
      }
    }

    loadAccounts();
  }, []);
  function validateRow(row: CsvRow): ValidationResult {
    const errors: string[] = [];

    if (!row.content?.trim()) {
      errors.push("Missing content");
    }

    if (!row.schedule_time?.trim()) {
      errors.push("Missing schedule time");
    } else {
      const date = new Date(row.schedule_time);

      if (isNaN(date.getTime())) {
        errors.push("Invalid schedule time");
      }
    }

    /*
      Optional image
  */

    if (row.image_url && row.image_url.trim()) {
      try {
        new URL(row.image_url);
      } catch {
        errors.push("Invalid image URL");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  function handleFile(file: File) {
    setImportErrors([]);
    setLoading(true);
    setMessage("");

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ",",

      transformHeader: (header) =>
        header
          .replace(/^\uFEFF/, "")
          .trim()
          .toLowerCase(),

      complete: (result) => {
        console.log("PARSED:", result.data);

        const parsedRows = result.data as CsvRow[];

        /*
        Reject malformed CSVs
      */
        if (parsedRows.length && Object.keys(parsedRows[0]).length === 1) {
          alert("Invalid CSV format.\n\nPlease use the downloadable template.");

          setLoading(false);
          return;
        }

        setRows(parsedRows);
        setValidations(parsedRows.map(validateRow));

        setLoading(false);
      },

      error: (error) => {
        setLoading(false);
        alert(error.message);
      },
    });
  }

  async function importPosts() {
    const validRows = rows.filter((_, index) => validations[index].valid);

    if (validRows.length === 0) {
      alert("No valid rows found");
      return;
    }
    if (selectedAccounts.length === 0) {
      alert("Please select at least one account");

      return;
    }
    try {
      setImporting(true);

      const response = await fetch("/api/posts/bulk", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          accounts: selectedAccounts,
          rows: validRows,
        }),
      });

      const result = await response.json();

      setMessage(
        `Successfully imported ${result.created} posts. Failed imports: ${result.failed}.`,
      );

      setImportErrors(result.errors || []);

      if (result.errors?.length) {
        console.log("Bulk Errors:", result.errors);
      }
    } catch (error) {
      console.error(error);
      alert("Import failed");
    } finally {
      setImporting(false);
    }
  }

  const validCount = validations.filter((v) => v.valid).length;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bulk Upload</h1>

        <p className="text-gray-500 mt-2">Upload multiple posts using CSV</p>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h2 className="font-semibold mb-4">CSV Format</h2>

        <pre>
          {`content,schedule_time,image_url
Hello World,2026-07-01T10:00:00,https://picsum.photos/400
Another Post,2026-07-02T15:00:00,`}
        </pre>
      </div>

      <a href="/bulk-template.csv" download className="text-blue-600 underline">
        Download CSV Template
      </a>

      <div className="bg-white border rounded-lg p-6">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => {
            const file = e.target.files?.[0];

            if (file) {
              handleFile(file);
            }
          }}
        />
      </div>

      {loading && <div>Parsing CSV...</div>}

      {rows.length > 0 && (
        <>
          <div className="flex gap-6">
            <div className="bg-green-50 border border-green-200 rounded p-4">
              Valid: {validCount}
            </div>

            <div className="bg-red-50 border border-red-200 rounded p-4">
              Invalid: {rows.length - validCount}
            </div>
          </div>

          {rows.length > 0 && (
            <div className="bg-white border rounded-lg p-6">
              <h2 className="font-semibold mb-4">Publish To Accounts</h2>

              <div className="flex gap-4 mb-4">
                <button
                  type="button"
                  className="px-3 py-1 bg-blue-100 rounded"
                  onClick={() => setSelectedAccounts(accounts.map((a) => a.id))}
                >
                  Select All
                </button>

                <button
                  type="button"
                  className="px-3 py-1 bg-gray-100 rounded"
                  onClick={() => setSelectedAccounts([])}
                >
                  Clear All
                </button>
              </div>

              <div className="text-sm text-gray-500 mb-4">
                Selected: {selectedAccounts.length}/{accounts.length} accounts
              </div>

              <div className="space-y-2">
                {accounts.map((account) => (
                  <label
                    key={account.id}
                    className="
            flex
            items-center
            gap-3
            p-3
            border
            rounded
            hover:bg-gray-50
            cursor-pointer
          "
                  >
                    <input
                      type="checkbox"
                      checked={selectedAccounts.includes(account.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAccounts([
                            ...selectedAccounts,
                            account.id,
                          ]);
                        } else {
                          setSelectedAccounts(
                            selectedAccounts.filter((id) => id !== account.id),
                          );
                        }
                      }}
                    />

                    <span
                      className="
              px-2
              py-1
              rounded
              text-xs
              bg-blue-100
            "
                    >
                      {account.platform}
                    </span>

                    <span>{account.account_name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Bulk Publish Targets</h3>

            <div className="flex flex-wrap gap-2">
              {accounts
                .filter((a) => selectedAccounts.includes(a.id))
                .map((a) => (
                  <div
                    key={a.id}
                    className="
            flex
            items-center
            gap-2
            px-3
            py-2
            bg-white
            border
            rounded
          "
                  >
                    <span
                      className="
              px-2
              py-1
              rounded
              text-xs
              bg-blue-100
            "
                    >
                      {a.platform}
                    </span>

                    <span>{a.account_name}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Preview ({rows.length} rows)</h2>
            </div>

            <div className="overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-4 text-left">#</th>

                    <th className="p-4 text-left">Content</th>

                    <th className="p-4 text-left">Schedule</th>

                    <th className="p-4 text-left">Image</th>

                    <th className="p-4 text-left">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, index) => {
                    const validation = validations[index];

                    return (
                      <tr key={index} className="border-t">
                        <td className="p-4">{index + 1}</td>

                        <td className="p-4 max-w-md">{row.content}</td>

                        <td className="p-4">{row.schedule_time}</td>

                        <td className="p-4">
                          {row.image_url ? (
                            <a
                              href={row.image_url}
                              target="_blank"
                              className="text-blue-600"
                            >
                              View
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td className="p-4">
                          {validation?.valid ? (
                            <span className="text-green-600">✓ Valid</span>
                          ) : (
                            <div className="text-red-600 text-sm">
                              {validation?.errors.map((error, i) => (
                                <div key={i}>• {error}</div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              disabled={
                importing || validCount === 0 || selectedAccounts.length === 0
              }
              onClick={importPosts}
              className="bg-blue-600 text-white px-6 py-3 rounded"
            >
              {importing
                ? "Importing..."
                : `Import ${validCount} Posts → ${
                    validCount * selectedAccounts.length
                  } Targets`}
            </button>

            <button
              onClick={() => {
                setRows([]);
                setValidations([]);
                setMessage("");
                setSelectedAccounts(accounts.map((a) => a.id));
                setImportErrors([]);
              }}
              className="bg-gray-200 px-6 py-3 rounded"
            >
              Clear
            </button>

            <div className="text-sm text-gray-500">
              Will create <b>{validCount}</b> posts and{" "}
              <b>{validCount * selectedAccounts.length}</b> publish targets
            </div>
          </div>
        </>
      )}

      {message && (
        <div className="space-y-4">
          <div
            className="
      bg-green-50
      border
      border-green-200
      rounded
      p-4
    "
          >
            {message}
          </div>

          {importErrors.length > 0 && (
            <div
              className="
        bg-red-50
        border
        border-red-200
        rounded
        p-4
      "
            >
              <h3 className="font-semibold mb-2">Import Errors</h3>

              {importErrors.map((error, index) => (
                <div key={index}>
                  Row {error.row}: {error.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
