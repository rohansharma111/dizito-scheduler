"use client";

import { useState } from "react";
import Papa from "papaparse";

type CsvRow = {
  content?: string;
  schedule_time?: string;
  image_url?: string;
  accounts?: string;
};

type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export default function BulkUploadPage() {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [validations, setValidations] = useState<ValidationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

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

    if (!row.accounts?.trim()) {
      errors.push("Missing accounts");
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
    setLoading(true);
    setMessage("");

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,

      complete: (result) => {
        const parsedRows = result.data;

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
    const validRows = rows
      .map((row, index) => ({
        row,
        validation: validations[index],
      }))
      .filter((x) => x.validation.valid)
      .map((x) => ({
        content: x.row.content,
        schedule_time: x.row.schedule_time,
        image_url: x.row.image_url || "",
        accounts: x.row.accounts?.split("|").map(Number) || [],
      }));

    if (validRows.length === 0) {
      alert("No valid rows found");

      return;
    }

    try {
      setImporting(true);

      /*
        API next step
      */

      const response = await fetch("/api/posts/bulk", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          rows: validRows,
        }),
      });

      const result = await response.json();

      setMessage(
        `
Created:
${result.created}

Failed:
${result.failed}
`,
      );

      setMessage(`Ready to import ${validRows.length} rows`);
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

        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
          {`content,schedule_time,image_url,accounts
Hello World,2026-07-01T10:00:00,https://picsum.photos/400,1|2
Another Post,2026-07-02T15:00:00,,2|3`}
        </pre>
      </div>

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

                    <th className="p-4 text-left">Accounts</th>

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

                        <td className="p-4">{row.accounts}</td>

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
              disabled={importing}
              onClick={importPosts}
              className="bg-blue-600 text-white px-6 py-3 rounded"
            >
              {importing ? "Importing..." : `Import ${validCount} Posts`}
            </button>

            <button
              onClick={() => {
                setRows([]);
                setValidations([]);
                setMessage("");
              }}
              className="bg-gray-200 px-6 py-3 rounded"
            >
              Clear
            </button>
          </div>
        </>
      )}

      {message && (
        <div className="bg-green-50 border border-green-200 rounded p-4">
          {message}
        </div>
      )}
    </div>
  );
}
