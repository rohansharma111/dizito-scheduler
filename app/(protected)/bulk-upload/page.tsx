"use client";

import { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import { FaInstagram, FaFacebook, FaLinkedin } from "react-icons/fa";
import Link from "next/link";
import { hasFeature } from "@/lib/plans";
import { useDropzone } from "react-dropzone";

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

function getPlatformIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case "instagram":
      return <FaInstagram />;

    case "facebook":
      return <FaFacebook />;

    case "linkedin":
      return <FaLinkedin />;

    default:
      return platform;
  }
}

export default function BulkUploadPage() {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [validations, setValidations] = useState<ValidationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState("free");
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "text/csv": [".csv"],
    },

    onDrop: (files) => {
      if (files[0]) {
        handleFile(files[0]);
      }
    },
  });
  const selectedValidCount = selectedRows.filter(
    (i) => validations[i]?.valid,
  ).length;
  const importDisabled =
    importing || selectedValidCount === 0 || selectedAccounts.length === 0;
  const [importErrors, setImportErrors] = useState<
    {
      row: number;
      error: string;
    }[]
  >([]);

  useEffect(() => {
    async function initialize() {
      const [planResponse, accountResponse] = await Promise.all([
        fetch("/api/me"),
        fetch("/api/accounts"),
      ]);

      const session = await planResponse.json();

      setPlan(session?.user?.plan || "free");

      const accountData = await accountResponse.json();

      const accountList = Array.isArray(accountData.accounts)
        ? accountData.accounts
        : [];

      setAccounts(accountList);

      setSelectedAccounts(accountList.map((a: SocialAccount) => a.id));
    }

    initialize();
  }, []);

  function formatSchedule(dateString?: string) {
    if (!dateString) return "-";

    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

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
      Mandatory Image
  */

    if (!row.image_url?.trim()) {
      errors.push("Missing image URL");
    } else {
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
    if (file.size > 5 * 1024 * 1024) {
      alert("Maximum CSV size is 5MB");

      return;
    }
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
        if (parsedRows.length > 1000) {
          setLoading(false);
          alert("Maximum 1000 rows");

          return;
        }
        /*
        Reject malformed CSVs
      */
        if (parsedRows.length && Object.keys(parsedRows[0]).length === 1) {
          alert("Invalid CSV format.\n\nPlease use the downloadable template.");

          setLoading(false);
          return;
        }

        const seen = new Set<string>();

        const nextValidations = parsedRows.map((row) => {
          const validation = validateRow(row);

          const key = `${row.content}-${row.schedule_time}`;

          if (seen.has(key)) {
            validation.valid = false;
            validation.errors.push("Duplicate row");
          }

          seen.add(key);

          return validation;
        });

        setRows(parsedRows);
        setValidations(nextValidations);

        setSelectedRows(
          parsedRows.map((_, i) => i).filter((i) => nextValidations[i].valid),
        );

        setLoading(false);
      },

      error: (error) => {
        setLoading(false);
        alert(error.message);
      },
    });
  }

  async function importPosts() {
    const targetCount = selectedValidCount * selectedAccounts.length;

    if (targetCount > 500) {
      if (
        !confirm(
          `You are about to create ${targetCount} publishing targets. Continue?`,
        )
      ) {
        return;
      }
    }
    const validRows = rows.filter(
      (_, index) => validations[index].valid && selectedRows.includes(index),
    );

    if (validRows.length === 0) {
      alert("No valid rows found");
      return;
    }
    if (selectedAccounts.length === 0) {
      alert("Please select at least one account");

      return;
    }
    try {
      if (
        !confirm(
          `Import ${selectedValidCount} posts to ${selectedAccounts.length} accounts?`,
        )
      ) {
        return;
      }
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
        `
✅ Imported:
${result.created} posts

🎯 Created:
${result.created * selectedAccounts.length}
 targets

❌ Failed:
${result.failed}
`,
      );

      setImportErrors(result.errors || []);
      if (result.failed === 0) {
        setRows([]);
        setValidations([]);
        setSelectedRows([]);
      }
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

  if (!hasFeature(plan, "bulkUpload")) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border rounded p-6">
          <h2 className="text-xl font-bold">Bulk Upload</h2>

          <p className="mt-2">
            Bulk upload is available on Creator and Agency plans.
          </p>

          <Link
            href="/pricing"
            className="
            mt-4
            inline-block
            bg-blue-600
            text-white
            px-4
            py-2
            rounded
          "
          >
            Upgrade Plan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bulk Upload</h1>

        <p className="text-gray-500 mt-2">Upload multiple posts using CSV</p>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h2 className="font-semibold mb-4">CSV Format</h2>

        <pre
          className="
    bg-gray-100
    p-3
    rounded
    text-xs
    md:text-sm
    overflow-x-auto
    whitespace-pre-wrap
    break-all
  "
        >
          {`content,schedule_time,image_url
Hello World,2026-07-01T10:00:00,https://picsum.photos/400
Another Post,2026-07-02T15:00:00,`}
        </pre>
      </div>

      <a href="/bulk-template.csv" download className="text-blue-600 underline">
        Download CSV Template
      </a>

      <div
        {...getRootProps()}
        className="
    border-2
    border-dashed
    rounded-lg
    p-10
    text-center
    cursor-pointer
  "
      >
        <input
          ref={fileInputRef}
          disabled={importing}
          type="file"
          accept=".csv"
          onChange={(e) => {
            const file = e.target.files?.[0];

            if (file) {
              handleFile(file);
            }
          }}
          {...getInputProps()}
        />
        Drop CSV here or click to upload
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

          <div className="bg-white border rounded-lg p-6">
            <h2 className="font-semibold mb-4">Publish To Accounts</h2>

            {accounts.length === 0 ? (
              <div
                className="
        py-8
        text-center
        text-gray-500
      "
              >
                <div className="mb-2">No social accounts connected.</div>

                <Link
                  href="/accounts"
                  className="
    text-blue-600
    underline
  "
                >
                  Connect Account
                </Link>
              </div>
            ) : (
              <>
                <div className="flex gap-4 mb-4">
                  <button
                    disabled={importing}
                    type="button"
                    className="
            px-3
            py-1
            bg-blue-100
            rounded
          "
                    onClick={() =>
                      setSelectedAccounts(accounts.map((a) => a.id))
                    }
                  >
                    Select All
                  </button>

                  <button
                    disabled={importing}
                    type="button"
                    className="
            px-3
            py-1
            bg-gray-100
            rounded
          "
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
                        disabled={importing}
                        type="checkbox"
                        checked={selectedAccounts.includes(account.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAccounts(
                              Array.from(
                                new Set([...selectedAccounts, account.id]),
                              ),
                            );
                          } else {
                            setSelectedAccounts(
                              selectedAccounts.filter(
                                (id) => id !== account.id,
                              ),
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
                  bg-gray-100
                "
                      >
                        {getPlatformIcon(account.platform)} {account.platform}
                      </span>

                      <span>{account.account_name}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-semibold">
                Preview(
                {selectedValidCount}
                selected posts,
                {selectedValidCount * selectedAccounts.length}
                targets )
              </h2>
            </div>

            <div className="overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-4">
                      <input
                        disabled={importing}
                        type="checkbox"
                        checked={selectedValidCount === validCount}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRows(
                              rows
                                .map((_, i) => i)
                                .filter((i) => validations[i]?.valid),
                            );
                          } else {
                            setSelectedRows([]);
                          }
                        }}
                      />
                    </th>
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
                      <tr
                        key={index}
                        className={
                          validation?.valid ? "border-t" : "border-t bg-red-50"
                        }
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            disabled={importing || !validation?.valid}
                            checked={selectedRows.includes(index)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRows(
                                  Array.from(new Set([...selectedRows, index])),
                                );
                              } else {
                                setSelectedRows(
                                  selectedRows.filter((i) => i !== index),
                                );
                              }
                            }}
                          />
                        </td>
                        <td className="p-4">{index + 1}</td>

                        <td className="p-4 max-w-md">{row.content}</td>

                        <td className="p-4 whitespace-nowrap">
                          {formatSchedule(row.schedule_time)}
                        </td>

                        <td className="p-4">
                          {row.image_url ? (
                            <img
                              src={row.image_url}
                              alt=""
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.src = "/image-error.svg";
                              }}
                              className="
                                w-12
                                h-12
                                rounded
                                object-cover
                                border
    border-gray-200
        "
                            />
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
              disabled={importDisabled}
              onClick={importPosts}
              className={`
    px-6
    py-3
    rounded
    text-white
    transition

    ${
      importDisabled
        ? `
          bg-gray-300
          cursor-not-allowed
          opacity-60
        `
        : `
          bg-blue-600
          hover:bg-blue-700
        `
    }
  `}
            >
              {importing
                ? "Importing..."
                : `Import ${selectedValidCount} Posts (${selectedValidCount * selectedAccounts.length} Targets)`}
            </button>

            <button
              disabled={importing}
              onClick={() => {
                setSelectedRows([]);
                setRows([]);
                setValidations([]);
                setMessage("");
                setSelectedAccounts(accounts.map((a) => a.id));
                setImportErrors([]);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              className={`
  px-6 py-3 rounded
  ${importing ? "bg-gray-100 cursor-not-allowed" : "bg-gray-200"}
`}
            >
              Clear
            </button>

            <div className="text-sm">
              Selected:
              <b>{selectedValidCount}</b>
              posts → <b>{selectedValidCount * selectedAccounts.length}</b>
              targets
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
