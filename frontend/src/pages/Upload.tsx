import { useState } from "react";
import { toast } from "sonner";

const Upload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return toast("Please select a file");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      toast(`File queued! ID: ${data.document_id}`);
    } catch (err) {
      console.error(err);
      toast("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Upload Document</h1>
      <input type="file" onChange={handleChange} />
      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
      >
        {loading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
};

export default Upload;
