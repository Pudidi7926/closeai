import React, { useState, useEffect } from 'react';
import { X, Maximize2, Minimize2, Copy, Download, Code } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

interface CanvasProps {
  content: string;
  isOpen: boolean;
  onClose: () => void;
  type: 'html' | 'markdown' | 'text' | 'code';
}

export const Canvas: React.FC<CanvasProps> = ({ content, isOpen, onClose, type }) => {
  const [isMaximized, setIsMaximized] = useState(false);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={cn(
        "fixed right-0 top-0 bottom-0 z-40 flex flex-col bg-white dark:bg-[#1a1a1a] border-l border-gray-200 dark:border-[#333] shadow-2xl",
        isMaximized ? "left-0 w-full" : "w-full md:w-[600px] lg:w-[800px]"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b dark:border-[#333]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-500/20 rounded-lg">
            <Code className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Artifacts Viewer</h3>
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMaximized(!isMaximized)} className="p-2 hover:bg-gray-100 dark:hover:bg-[#262626] rounded-lg transition-colors">
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#262626] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 custom-scrollbar">
        {type === 'html' ? (
          <iframe
            srcDoc={content}
            title="Canvas Preview"
            className="w-full h-full border-none bg-white"
            sandbox="allow-scripts"
          />
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>

      <div className="p-4 border-t dark:border-[#333] flex justify-end gap-3">
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold border rounded-xl hover:bg-gray-50 dark:hover:bg-[#262626] transition-colors">
          <Copy className="w-4 h-4" /> Salin
        </button>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors">
          <Download className="w-4 h-4" /> Unduh
        </button>
      </div>
    </motion.div>
  );
};
