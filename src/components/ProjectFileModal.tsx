import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileCode2,
  FolderOpen,
  Upload,
  X,
} from 'lucide-react';
import { CADProject, ProjectExportFormat } from '../types/cad';
import {
  PRESET_PROJECTS,
  deserializeProjectFile,
  serializeProject,
} from '../utils/projectFiles';

interface ProjectFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: CADProject;
  isValid: boolean;
  errorCount: number;
  onImportProject: (project: CADProject) => void;
}

export const ProjectFileModal: React.FC<ProjectFileModalProps> = ({
  isOpen,
  onClose,
  project,
  isValid,
  errorCount,
  onImportProject,
}) => {
  const [selectedFormat, setSelectedFormat] =
    useState<ProjectExportFormat>('method-topological-json');
  const [fileName, setFileName] = useState('project_sapr');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [pasteBuffer, setPasteBuffer] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const serialized = serializeProject(project, selectedFormat);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(serialized.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([serialized.content], {
      type: `${serialized.mime};charset=utf-8`,
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanName = fileName.trim() || 'project_sapr';
    link.download = `${cleanName}.${serialized.extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = String(ev.target?.result ?? '');
        const imported = deserializeProjectFile(text, file.name);
        onImportProject(imported);
        onClose();
      } catch (err) {
        setImportError(
          err instanceof Error ? err.message : 'Ошибка чтения файла проекта'
        );
      }
    };
    reader.readAsText(file);
  };

  const handlePasteImport = () => {
    setImportError(null);
    try {
      const imported = deserializeProjectFile(pasteBuffer, 'imported_project.json');
      onImportProject(imported);
      onClose();
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : 'Некорректный формат данных'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-[#121620] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-zinc-100">
        <div className="flex items-center justify-between px-6 py-4 bg-[#0d1017] border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <FileCode2 className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-zinc-100">
              Файл проекта (JSON / TXT)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-4 px-6 pt-3 border-b border-zinc-800 bg-[#121620]">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`pb-3 px-1 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'export'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Сохранить проект
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`pb-3 px-1 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'import'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Открыть проект
          </button>
        </div>

        {activeTab === 'export' ? (
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {!isValid && (
              <div className="p-3 rounded-lg bg-amber-950/50 border border-amber-800/70 text-xs text-amber-300">
                ▲ В схеме есть несоответствия ({errorCount}). Рекомендуется исправить их перед сохранением.
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-400">
                Формат файла
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    id: 'method-topological-json',
                    title: 'JSON (По узлам · xr, xs, xc)',
                    desc: 'Массивы узлов, стержней, опор и нагрузок',
                  },
                  {
                    id: 'method-rods-json',
                    title: 'JSON (По стержням · Rods, Knots)',
                    desc: 'Последовательное описание стержней',
                  },
                  {
                    id: 'method-txt',
                    title: 'TXT (Текстовый формат)',
                    desc: 'nodes / thicknesses / E / sygmas / pillars',
                  },
                  {
                    id: 'sapr-json',
                    title: 'JSON (Полный проект САПР)',
                    desc: 'Структурированный файл проекта',
                  },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() =>
                      setSelectedFormat(fmt.id as ProjectExportFormat)
                    }
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      selectedFormat === fmt.id
                        ? 'bg-blue-950/40 border-blue-500 text-zinc-100'
                        : 'bg-[#0d1017] border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div className="text-xs font-semibold">{fmt.title}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      {fmt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Имя файла
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-[#0d1017] border border-zinc-800 rounded-l-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                    placeholder="project_sapr"
                  />
                  <span className="px-3 py-2 text-xs font-mono bg-zinc-900 border border-l-0 border-zinc-800 rounded-r-lg text-zinc-400">
                    .{serialized.extension}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-zinc-200 bg-[#0d1017] border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Скопировано</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Копировать</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Скачать файл</span>
              </button>
            </div>

            <pre className="p-4 rounded-lg bg-[#090b10] border border-zinc-800/80 text-zinc-300 text-xs font-mono overflow-x-auto max-h-56 leading-relaxed">
              {serialized.content}
            </pre>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {importError && (
              <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-xs text-rose-300">
                ✖ {importError}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-400">
                Готовые задачи:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PRESET_PROJECTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onImportProject(item.project);
                      onClose();
                    }}
                    className="p-2.5 rounded-lg bg-[#0d1017] border border-zinc-800 hover:border-blue-500 text-left transition-colors"
                  >
                    <div className="text-xs font-semibold text-zinc-100">
                      {item.title}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                      {item.project.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-2 border-dashed border-zinc-800 rounded-xl p-6 text-center bg-[#0d1017]/60">
              <FolderOpen className="w-7 h-7 text-zinc-500 mx-auto mb-2" />
              <div className="text-xs font-semibold text-zinc-200 mb-3">
                Выберите файл проекта (.json или .txt)
              </div>
              <label className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Выбрать файл</span>
                <input
                  type="file"
                  accept=".json,.txt,.sapr"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-400">
                Или вставьте содержимое файла вручную:
              </label>
              <textarea
                rows={5}
                value={pasteBuffer}
                onChange={(e) => setPasteBuffer(e.target.value)}
                placeholder='{"xr":[0,3,5,8],"xs":[{"I":1,"J":2,"Ig":1}...]}'
                className="w-full p-3 text-xs font-mono bg-[#0d1017] border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!pasteBuffer.trim()}
                  onClick={handlePasteImport}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-40 transition-colors"
                >
                  Загрузить из текста
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
