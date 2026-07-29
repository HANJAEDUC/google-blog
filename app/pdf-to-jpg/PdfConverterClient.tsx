"use client";

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import styles from './pdf-to-jpg.module.css';
import {
  IoCloudUploadOutline,
  IoDownloadOutline,
  IoShieldCheckmarkOutline,
  IoDocumentTextOutline,
  IoRefreshOutline,
  IoGridOutline,
  IoLayersOutline,
} from 'react-icons/io5';
import JSZip from 'jszip';

interface PageResult {
  pageIndex: number;
  dataUrl: string;
  width: number;
  height: number;
}

export default function PdfConverterClient() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [scale, setScale] = useState<number>(2.0); // Default 2.0x High Quality
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [pages, setPages] = useState<PageResult[]>([]);
  const [outputMode, setOutputMode] = useState<'separate' | 'merged'>('separate');
  const [mergedDataUrl, setMergedDataUrl] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to load PDF.js via CDN dynamically (bypasses Node.js 'canvas' module issues)
  const getPdfJsLib = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib;
        if (pdfjsLib) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve(pdfjsLib);
        } else {
          reject(new Error('PDF.js library failed to initialize'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load PDF.js script from CDN'));
      document.head.appendChild(script);
    });
  };

  // Helper to merge all converted pages into a single vertical JPG canvas
  const generateMergedImage = async (pageList: PageResult[]): Promise<string | null> => {
    if (pageList.length === 0) return null;
    if (pageList.length === 1) return pageList[0].dataUrl;

    setIsMerging(true);
    try {
      const maxWidth = Math.max(...pageList.map((p) => p.width));
      const totalHeight = pageList.reduce((sum, p) => sum + p.height, 0);

      const canvas = document.createElement('canvas');
      canvas.width = maxWidth;
      canvas.height = totalHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) return null;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, maxWidth, totalHeight);

      let currentY = 0;
      for (const page of pageList) {
        const img = new Image();
        img.src = page.dataUrl;
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
        });
        ctx.drawImage(img, 0, currentY, page.width, page.height);
        currentY += page.height;
      }

      return canvas.toDataURL('image/jpeg', 0.92);
    } catch (err) {
      console.error('Failed to generate merged image:', err);
      return null;
    } finally {
      setIsMerging(false);
    }
  };

  const processPdf = async (pdfFile: File, renderScale: number, passwordInput?: string) => {
    setLoading(true);
    setPages([]);
    setMergedDataUrl(null);
    setProgress({ current: 0, total: 0 });

    try {
      const pdfjsLib = await getPdfJsLib();
      const arrayBuffer = await pdfFile.arrayBuffer();

      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        password: passwordInput,
      });

      // Handle password prompt callback if required
      loadingTask.onPassword = (updatePassword: (pw: string) => void, reason: number) => {
        const userPw = prompt(
          reason === 1
            ? '🔒 이 PDF 파일은 암호로 보호되어 있습니다. 비밀번호(월급명세서의 경우 생년월일 등)를 입력해 주세요:'
            : '❌ 비밀번호가 올바르지 않습니다. 다시 입력해 주세요:'
        );
        if (userPw !== null) {
          updatePassword(userPw);
        } else {
          setLoading(false);
        }
      };

      const pdfDoc = await loadingTask.promise;
      const numPages = pdfDoc.numPages;

      setProgress({ current: 0, total: numPages });
      const convertedPages: PageResult[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: renderScale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          await page.render(renderContext as any).promise;

          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          convertedPages.push({
            pageIndex: i,
            dataUrl: dataUrl,
            width: viewport.width,
            height: viewport.height,
          });
        }

        setProgress({ current: i, total: numPages });
      }

      setPages(convertedPages);

      // Auto-generate merged image if 2 or more pages
      if (convertedPages.length >= 2) {
        const merged = await generateMergedImage(convertedPages);
        setMergedDataUrl(merged);
      }
    } catch (error: any) {
      console.error('Error processing PDF:', error);
      if (error?.name === 'PasswordException') {
        return;
      }
      alert(`PDF 변환 중 오류가 발생했습니다: ${error?.message || '다른 PDF 파일로 시도해 주세요.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf')) {
        setFile(selectedFile);
        processPdf(selectedFile, scale);
      } else {
        alert('PDF 파일만 업로드할 수 있습니다.');
      }
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf' || droppedFile.name.endsWith('.pdf')) {
        setFile(droppedFile);
        processPdf(droppedFile, scale);
      } else {
        alert('PDF 파일만 업로드할 수 있습니다.');
      }
    }
  };

  const handleScaleChange = (newScale: number) => {
    setScale(newScale);
    if (file) {
      processPdf(file, newScale);
    }
  };

  const downloadSinglePage = (page: PageResult) => {
    const link = document.createElement('a');
    link.href = page.dataUrl;
    const baseName = file ? file.name.replace(/\.pdf$/i, '') : 'document';
    link.download = `${baseName}_${page.pageIndex}.jpg`;
    link.click();
  };

  const downloadAllAsZip = async () => {
    if (pages.length === 0) return;

    const zip = new JSZip();
    const baseName = file ? file.name.replace(/\.pdf$/i, '') : 'document';

    pages.forEach((p) => {
      const base64Data = p.dataUrl.replace(/^data:image\/jpeg;base64,/, '');
      zip.file(`${baseName}_${p.pageIndex}.jpg`, base64Data, { base64: true });
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${baseName}_all.zip`;
    link.click();
  };

  const downloadMergedImage = () => {
    if (!mergedDataUrl) return;
    const link = document.createElement('a');
    link.href = mergedDataUrl;
    const baseName = file ? file.name.replace(/\.pdf$/i, '') : 'document';
    link.download = `${baseName}_${pages.length}.jpg`;
    link.click();
  };

  const handleReset = () => {
    setFile(null);
    setPages([]);
    setMergedDataUrl(null);
    setOutputMode('separate');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <span className={styles.badgeTitle}>Free & Private Utility</span>
        <h1 className={styles.title}>PDF ➡️ JPG 변환기</h1>
        <p className={styles.subtitle}>
          서버 업로드 없이 100% 브라우저 내부에서 고화질 JPG 이미지로 변환합니다.
        </p>
      </header>

      {/* Privacy Banner */}
      <div className={styles.privacyBanner}>
        <IoShieldCheckmarkOutline size={20} />
        <span>개인정보 안전: 파일이 외부 서버로 전송되지 않고 컴퓨터 내에서 바로 변환됩니다.</span>
      </div>

      {/* Dropzone */}
      {!file && (
        <div
          className={`${styles.dropzone} ${isDragOver ? styles.dropzoneActive : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <IoCloudUploadOutline size={54} className={styles.uploadIcon} />
          <div className={styles.dropText}>PDF 파일을 이곳에 드래그하거나 클릭하여 선택하세요</div>
          <div className={styles.subText}>최대 파일 크기 제한 없이 무료로 이용 가능합니다.</div>
          <button className={styles.selectBtn}>PDF 파일 선택</button>
          <input
            type="file"
            accept=".pdf,application/pdf"
            ref={fileInputRef}
            onChange={handleFileChange}
            className={styles.hiddenInput}
          />
        </div>
      )}

      {/* Options Bar & Actions */}
      {file && (
        <div className={styles.optionsBar}>
          <div className={styles.fileInfo}>
            <IoDocumentTextOutline size={22} color="#4285f4" />
            <span>{file.name} ({pages.length} 페이지)</span>
          </div>

          <div className={styles.optionsRight}>
            <div className={styles.qualitySelect}>
              <span>화질:</span>
              <select
                className={styles.selectInput}
                value={scale}
                onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                disabled={loading}
              >
                <option value={1.5}>일반 (1.5x)</option>
                <option value={2.0}>고화질 (2.0x 추천)</option>
                <option value={3.0}>초고화질 (3.0x)</option>
              </select>
            </div>

            {pages.length > 0 && outputMode === 'separate' && (
              <button className={styles.zipBtn} onClick={downloadAllAsZip}>
                <IoDownloadOutline size={18} />
                전체 ZIP 다운로드 ({pages.length}장)
              </button>
            )}

            {pages.length > 0 && outputMode === 'merged' && mergedDataUrl && (
              <button className={styles.mergedDlTopBtn} onClick={downloadMergedImage}>
                <IoDownloadOutline size={18} />
                통합 JPG 다운로드 (1장)
              </button>
            )}

            <button className={styles.resetBtn} onClick={handleReset}>
              <IoRefreshOutline size={16} />
              새 파일
            </button>
          </div>
        </div>
      )}

      {/* Output Mode Switcher for Multi-page PDFs */}
      {file && pages.length >= 2 && !loading && (
        <div className={styles.modeSection}>
          <div className={styles.modeLabel}>저장 형식 선택:</div>
          <div className={styles.modeSwitcher}>
            <button
              className={`${styles.modeBtn} ${outputMode === 'separate' ? styles.modeBtnActive : ''}`}
              onClick={() => setOutputMode('separate')}
            >
              <IoGridOutline size={18} />
              <span>각 페이지별 JPG ({pages.length}개 파일)</span>
            </button>

            <button
              className={`${styles.modeBtn} ${outputMode === 'merged' ? styles.modeBtnActive : ''}`}
              onClick={() => setOutputMode('merged')}
            >
              <IoLayersOutline size={18} />
              <span>1개의 통합 JPG (세로 연속 이미지)</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading Progress */}
      {loading && (
        <div className={styles.progressContainer}>
          <div style={{ fontSize: '16px', fontWeight: 600 }}>
            PDF 렌더링 변환 중... ({progress.current} / {progress.total} 페이지)
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%',
              }}
            />
          </div>
        </div>
      )}

      {/* Converted Pages Grid (Separate Mode or 1-page PDF) */}
      {!loading && pages.length > 0 && (outputMode === 'separate' || pages.length === 1) && (
        <div className={styles.grid}>
          {pages.map((p) => (
            <div key={p.pageIndex} className={styles.pageCard}>
              <div className={styles.imgWrapper}>
                <img src={p.dataUrl} alt={`Page ${p.pageIndex}`} className={styles.pageImg} />
              </div>
              <div className={styles.pageFooter}>
                <span className={styles.pageNumber}>{p.pageIndex} 페이지</span>
                <button
                  className={styles.dlSingleBtn}
                  onClick={() => downloadSinglePage(p)}
                >
                  <IoDownloadOutline size={16} />
                  JPG 다운로드
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Merged Single Image Mode (Multi-page PDF) */}
      {!loading && pages.length >= 2 && outputMode === 'merged' && (
        <div className={styles.mergedCard}>
          {isMerging ? (
            <div className={styles.mergingStatus}>1개의 통합 JPG 합성 중...</div>
          ) : mergedDataUrl ? (
            <>
              <div className={styles.mergedHeader}>
                <div className={styles.mergedTitleGroup}>
                  <IoLayersOutline size={22} color="#4285f4" />
                  <div>
                    <h3 className={styles.mergedTitle}>통합 이미지 ({pages.length}개 페이지 결합)</h3>
                    <p className={styles.mergedSub}>모든 페이지가 세로 순서대로 합쳐진 1개의 JPG 파일입니다.</p>
                  </div>
                </div>
                <button className={styles.mergedDlMainBtn} onClick={downloadMergedImage}>
                  <IoDownloadOutline size={20} />
                  1개의 통합 JPG 다운로드
                </button>
              </div>
              <div className={styles.mergedImgWrapper}>
                <img src={mergedDataUrl} alt="Merged PDF pages" className={styles.mergedImg} />
              </div>
            </>
          ) : (
            <div className={styles.mergingStatus}>통합 이미지를 생성할 수 없습니다.</div>
          )}
        </div>
      )}
    </div>
  );
}

