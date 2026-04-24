import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Download, X, FileJson, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Conversation } from '../types';

interface ImportModalProps {
  onClose: () => void;
  onImport: (data: Conversation[]) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          // Simple validation/mapping
          const imported = Array.isArray(json) ? json : [json];
          onImport(imported as Conversation[]);
          onClose();
        } catch (err) {
          alert('File JSON tidak valid!');
        }
      };
      reader.readAsText(file);
    }
  }, [onImport, onClose]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/json': ['.json'] },
    multiple: false
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-md bg-white dark:bg-[#1a1a1a] p-6 rounded-3xl border border-gray-200 dark:border-[#333] shadow-2xl"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black italic">Impor Data JSON</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#262626] rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div 
          {...getRootProps()} 
          className={cn(
            "border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-4 transition-all cursor-pointer",
            isDragActive ? "border-orange-500 bg-orange-500/5 shadow-inner" : "border-gray-200 dark:border-[#333] hover:border-orange-500"
          )}
        >
          <input {...getInputProps()} />
          <div className="p-4 bg-orange-100 dark:bg-orange-500/10 rounded-full">
            <FileJson className="w-8 h-8 text-orange-600" />
          </div>
          <div className="text-center">
            <p className="font-bold">Klik atau seret file JSON</p>
            <p className="text-xs text-gray-500 mt-1">Impor riwayat chat dari AI lainnya</p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed font-medium">
            Pastikan file JSON memiliki format array of conversations atau single object conversation agar sinkronisasi berjalan lancar.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
