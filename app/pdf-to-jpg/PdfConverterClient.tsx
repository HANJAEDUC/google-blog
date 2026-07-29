"use client";

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import styles from './pdf-to-jpg.module.css';
import { IoCloudUploadOutline, IoDownloadOutline, IoShieldCheckmarkOutline, IoDocumentTextOutline, IoRefreshOutline } from 'react-icons/io5';
import JSZip from 'jszip';

interface PageResult {
  pageIndex: number;
  dataUrl: string;
}

export default function PdfConverterClient() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [scale, setScale] = useState<number>(2.0); // Default 2.0x High Quality
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [pages, setPages] = useState<PageResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processPdf = async (pdfFile: File, renderScale: number) => {
    setLoading(true);
    setPages([]);
    setProgress({ current: 0, total: 0 });

    try {
      // Dynamically import pdfjs-dist on client side
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
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
          });
        }

        setProgress({ current: i, total: numPages });
      }

      setPages(convertedPages);
    } catch (error) {
      console.error('Error processing PDF:', error);
      alert('PDF 변환 중 오류가 발생했습니다. 다른 PDF 파일로 시도해 주세요.');
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
    const baseName = file ? file.name.replace(/\.pdf$/i, '') : 'page';
    link.download = `${baseName}_page_${page.pageIndex}.jpg`;
    link.click();
  };

  const downloadAllAsZip = async () => {
    if (pages.length === 0) return;

    const zip = new JSZip();
    const baseName = file ? file.name.replace(/\.pdf$/i, '') : 'pdf_images';

    pages.forEach((p) => {
      // Remove header 'data:image/jpeg;base64,'
      const base64Data = p.dataUrl.replace(/^data:image\/jpeg;base64,/, '');
      zip.file(`${baseName}_page_${p.pageIndex}.jpg`, base64Data, { base64: true });
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${baseName}_jpg_all.zip`;
    link.click();
  };

  const handleReset = () => {
    setFile(null);
    setPages([]);
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

            {pages.length > 0 && (
              <button className={styles.zipBtn} onClick={downloadAllAsZip}>
                <IoDownloadOutline size={18} />
                전체 ZIP 다운로드 ({pages.length}장)
              </button>
            )}

            <button className={styles.resetBtn} onClick={handleReset}>
              <IoRefreshOutline size={16} />
              새 파일
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

      {/* Converted Pages Grid */}
      {pages.length > 0 && (
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
    </div>
  );
}
