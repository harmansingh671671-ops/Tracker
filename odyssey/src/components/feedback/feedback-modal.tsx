"use client";

import { useState } from "react";
import {
  MessageCircle,
  Copy,
  Check,
  Send,
  X,
  Star,
  Sparkles,
  Phone,
  ExternalLink,
} from "lucide-react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WHATSAPP_NUMBER = "8219554921";
const FORMATTED_PHONE = "+91 8219554921";
const WHATSAPP_LINK_BASE = "https://wa.me/918219554921";

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(WHATSAPP_NUMBER);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenWhatsApp = () => {
    const trimmed = message.trim();
    const defaultText = "Hi! I am using the Odyssey app and wanted to share some feedback/reviews:";
    const fullText = trimmed ? `${defaultText}\n\n${trimmed}` : defaultText;
    const url = `${WHATSAPP_LINK_BASE}?text=${encodeURIComponent(fullText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-3xl bg-surface-container-high border border-white/10 shadow-2xl p-5 sm:p-6 space-y-4 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Ambient Glow */}
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-surface-container hover:bg-surface-bright text-on-surface-variant hover:text-on-surface border border-outline/10 transition-all cursor-pointer"
          title="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with WhatsApp Branding */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-bold">
            <MessageCircle className="w-3.5 h-3.5 fill-emerald-400/20" />
            <span>DIRECT CREATOR FEEDBACK</span>
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-on-surface tracking-tight flex items-center gap-2">
            <span>Share Your Reviews &amp; Feedback</span>
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          </h3>

          <p className="text-xs text-on-surface-variant leading-relaxed">
            Feel free to give reviews, suggest features, report bugs, or share your thoughts directly
            with the creator on WhatsApp!
          </p>
        </div>

        {/* WhatsApp Contact Highlight Card */}
        <div className="p-3.5 rounded-2xl bg-surface-container border border-emerald-500/20 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant font-medium flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp Mobile Number</span>
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Available
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-container-highest border border-outline/15">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#25D366]/20 border border-[#25D366]/40 flex items-center justify-center text-[#25D366]">
                <MessageCircle className="w-4 h-4 fill-[#25D366]/30" />
              </div>
              <div className="flex flex-col">
                <span className="text-base sm:text-lg font-mono font-bold text-on-surface tracking-wide">
                  {FORMATTED_PHONE}
                </span>
                <span className="text-[10px] text-on-surface-variant font-mono">
                  Direct WhatsApp Chat
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                copied
                  ? "bg-emerald-500 text-black border-emerald-400"
                  : "bg-surface-container hover:bg-surface text-primary border-outline/20"
              }`}
              title="Copy phone number"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* Optional Pre-filled Message Input */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono text-on-surface-variant font-medium flex items-center justify-between">
            <span>Write your review or feedback (optional):</span>
            <span className="text-[10px] text-on-surface-variant/70">Will open in WhatsApp</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your review, thoughts, or suggestions here..."
            rows={3}
            className="w-full bg-surface-container-highest border border-outline/20 rounded-xl p-3 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-emerald-500 font-sans resize-none transition-all"
            maxLength={500}
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold font-mono text-xs shadow-lg shadow-[#25D366]/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <MessageCircle className="w-4 h-4 fill-black/20" />
            <span>WhatsApp on 8219554921</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-highest text-on-surface-variant text-xs font-mono font-medium transition-all cursor-pointer text-center"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Bottom-of-the-page banner button that can be embedded anywhere
 */
export function FeedbackBannerButton({ className = "" }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className={`w-full flex justify-center py-2 ${className}`}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-high hover:bg-surface-bright text-on-surface border border-outline/15 shadow-sm text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 hover:border-emerald-500/40 group"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <MessageCircle className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span>Give Feedback / Reviews</span>
          <span className="text-on-surface-variant/70 font-normal">
            • WhatsApp 8219554921
          </span>
        </button>
      </div>

      <FeedbackModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

/**
 * Floating bottom action button accessible on mobile and desktop
 */
export function FloatingFeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-3.5 sm:bottom-24 sm:right-6 z-40 flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface-container-high/95 hover:bg-surface-bright text-on-surface border border-emerald-500/30 shadow-lg backdrop-blur-md text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 hover:border-emerald-500/60 hover:shadow-emerald-500/10 group"
        title="Give Feedback or Reviews on WhatsApp"
        aria-label="Feedback"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <MessageCircle className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
        <span className="hidden xs:inline sm:inline text-[11px]">Feedback</span>
      </button>

      <FeedbackModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
