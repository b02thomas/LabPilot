import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { FileUpload } from "@/components/file-upload";

export default function DataUpload() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header
          title="Data Upload"
          description="Upload and process your laboratory data files"
        />

        <div className="p-6">
          <FileUpload />
        </div>
      </main>
    </div>
  );
}
