'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, authStorage } from '@/lib/api';
import {
  BookOpen,
  MessageSquare,
  RotateCcw,
  Sparkles,
  Command,
  Search,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  FileText,
  Upload,
  Plus,
  X,
  Send,
  HelpCircle,
  Hash,
  Layers,
  Check,
  Clock,
  Bookmark,
  Share2,
  Compass,
  Cpu,
  Brain,
  Video,
  GitBranch,
  ArrowDown,
  Layers3,
  Network,
  GraduationCap
} from 'lucide-react';

type StudyMode = 'read' | 'interrogate' | 'diagram' | 'recall';

interface DocSection {
  tag: string;
  title: string;
  body: string;
  formula?: string;
  formulaNote?: string;
}

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  citation: string;
  interval: string;
  box: number;
}

interface ConceptNode {
  id: string;
  layer: string;
  title: string;
  subtitle: string;
  formula: string;
  description: string;
}

interface DocMeta {
  id: string;
  title: string;
  type: string;
  authors: string;
  venue: string;
  readTime: string;
  groundedScore: number;
  sections: DocSection[];
  flashcards: Flashcard[];
  conceptNodes: ConceptNode[];
  initialChat: {
    welcome: string;
    citation: { section: string; quote: string };
  };
  sampleProbes: string[];
}

const DOC_PRESETS: Record<string, DocMeta> = {
  vaswani: {
    id: 'vaswani',
    title: 'Attention Is All You Need',
    type: 'PDF Paper',
    authors: 'Vaswani et al. (Google Brain & Google Research)',
    venue: 'NeurIPS 2017 · Citations: 120k+',
    readTime: '12 min',
    groundedScore: 98.4,
    sections: [
      {
        tag: '§ 1.0 Introduction',
        title: 'Recurrence Bottleneck in Sequence Transduction',
        body: 'Recurrent neural networks factor computation along the symbol positions of the input and output sequences. Aligning positions to steps in computation time, they generate a sequence of hidden states h_t. This inherently sequential nature precludes parallelization within training examples, which becomes critical at longer sequence lengths.'
      },
      {
        tag: '§ 3.2 Multi-Head Attention Mechanism',
        title: 'Scaled Dot-Product Projections',
        body: 'An attention function can be described as mapping a query and a set of key-value pairs to an output. Instead of performing a single attention function of dimension d_model, we found it beneficial to linearly project queries, keys, and values h = 8 times with different, learned linear projections.',
        formula: 'Attention(Q, K, V) = softmax(QKᵀ / √d_k)V',
        formulaNote: 'Dividing by √d_k prevents the dot products from growing excessively large for large key dimensions, avoiding saturation in regions of vanishing gradients.'
      }
    ],
    flashcards: [
      {
        id: 'fc-v1',
        question: 'Why does Scaled Dot-Product Attention divide logits by √d_k?',
        answer: 'For large values of d_k, dot products grow large in magnitude, pushing softmax into regions with extremely small gradients. Dividing by √d_k counteracts this variance scaling and stabilizes backpropagation.',
        citation: '§3.2.1 Scaled Dot-Product Attention (p. 4)',
        interval: '3 days',
        box: 2
      },
      {
        id: 'fc-v2',
        question: 'What is the computational complexity per layer of Self-Attention vs Recurrent layers?',
        answer: 'Self-Attention requires O(1) sequential operations with O(n² · d) total complexity, whereas Recurrent layers require O(n) sequential operations with O(n · d²) complexity, forming an unparallelizable bottleneck.',
        citation: 'Table 1: Maximum path lengths & complexity (p. 6)',
        interval: '6 days',
        box: 3
      },
      {
        id: 'fc-v3',
        question: 'How does Multi-Head Attention outperform a single attention function of dimension d_model?',
        answer: 'It jointly attends to information from different representation subspaces at different positions. A single attention head performs averaging which inhibits attending to multiple subspace relationships simultaneously.',
        citation: '§3.2.2 Multi-Head Attention (p. 5)',
        interval: '1 day',
        box: 1
      }
    ],
    conceptNodes: [
      {
        id: 'input',
        layer: 'Layer 1 · Input Embedding',
        title: 'Positional Encoding',
        subtitle: 'Sinusoidal frequencies inject sequential order',
        formula: 'PE(pos, 2i) = sin(pos / 10000^(2i/d_model))',
        description: 'Because the Transformer contains no recurrence and no convolution, sequence order must be injected via deterministic trigonometric phase shifts across dimensions.'
      },
      {
        id: 'mha',
        layer: 'Layer 2 · Multi-Head Attention',
        title: 'Multi-Head Attention (h=8)',
        subtitle: '8 parallel subspace projections with √d_k scaling',
        formula: 'MultiHead(Q,K,V) = Concat(head₁,...,head_h)W^O',
        description: 'Queries, keys, and values are projected into d_k = 64 dimensional subspaces where attention maps are computed concurrently and concatenated.'
      },
      {
        id: 'ffn',
        layer: 'Layer 3 · Position-Wise FFN',
        title: 'Feed-Forward Network',
        subtitle: 'Position-wise two-layer linear transformation',
        formula: 'FFN(x) = max(0, xW₁ + b₁)W₂ + b₂',
        description: 'Applied identically to each position separately. Uses inner hidden dimension d_ff = 2048 with ReLU activation and residual skip connection.'
      }
    ],
    initialChat: {
      welcome: 'Welcome to the Vaswani et al. (2017) study session. The document is indexed with 98.4% grounded provenance. What concept or mathematical proof would you like to examine?',
      citation: {
        section: '§1.0 Abstract & Introduction',
        quote: 'We propose the Transformer, a model architecture relying entirely on an attention mechanism to draw global dependencies between input and output.'
      }
    },
    sampleProbes: [
      'Why divide by √d_k instead of d_k?',
      'Compare O(1) path length vs RNNs.',
      'Explain sinusoidal positional encoding.'
    ]
  },

  deepseek: {
    id: 'deepseek',
    title: 'DeepSeek-R1: Incentivizing Reasoning via RL',
    type: 'arXiv Monograph',
    authors: 'DeepSeek-AI Team',
    venue: 'arXiv:2501.12948 (2025)',
    readTime: '18 min',
    groundedScore: 99.1,
    sections: [
      {
        tag: '§ 2.1 Rule-Based Reward Verification',
        title: 'Eliminating Reward Model Hacking',
        body: 'Traditional RLHF relies on neural reward models that suffer from reward hacking and drift during long chain-of-thought exploration. DeepSeek-R1 enforces deterministic rule-based verification: compiler pass/fail execution for code and ground-truth symbolic equivalence for mathematical proofs.'
      },
      {
        tag: '§ 3.1 Group Relative Policy Optimization (GRPO)',
        title: 'Critic-Free Reinforcement Learning',
        body: 'To mitigate the substantial memory overhead of training a separate value network equal in size to the policy model, GRPO samples a group of G candidate outputs for each query and computes normalized relative advantages across the sampled group.',
        formula: 'J_GRPO(θ) = E [ 1/G ∑ (min(r_i A_i, clip(...)A_i)) - β D_KL(π_θ || π_ref) ]',
        formulaNote: 'Advantage A_i is computed by normalizing output rewards within the group: (R_i - mean(R)) / std(R), eliminating the need for a critic model.'
      }
    ],
    flashcards: [
      {
        id: 'fc-d1',
        question: 'Why does GRPO eliminate the critic (value) model required in standard PPO?',
        answer: 'GRPO samples a group of candidate outputs {o_1, o_2, ..., o_G} for each prompt and estimates the baseline directly from the group mean and standard deviation, saving enormous GPU memory.',
        citation: '§3.1 Group Relative Policy Optimization (p. 5)',
        interval: '3 days',
        box: 2
      },
      {
        id: 'fc-d2',
        question: 'What is the role of cold-start data before initiating large-scale RL?',
        answer: 'A small curated dataset of high-quality long-chain reasoning traces formats the initial outputs with readable markdown, structured thinking tags (<think>...</think>), and prevents unreadable reasoning degeneracy.',
        citation: '§2.2 Cold-Start Data Curation (p. 4)',
        interval: '6 days',
        box: 3
      },
      {
        id: 'fc-d3',
        question: 'How does DeepSeek-R1 prevent language mixing during multilingual reasoning?',
        answer: 'A language consistency reward penalty is added to the reward signal during the second RL phase, discouraging spontaneous language switching inside reasoning chains.',
        citation: '§3.3 Language Consistency Penalty (p. 8)',
        interval: '1 day',
        box: 1
      }
    ],
    conceptNodes: [
      {
        id: 'input',
        layer: 'Stage 1 · Cold Start',
        title: 'Cold-Start Synthesis',
        subtitle: 'Curated CoT reasoning demonstrations',
        formula: 'D_cold = {(x, y_think, y_answer)}',
        description: 'Supervised fine-tuning on thousands of curated multi-step solutions bootstraps readable thinking patterns and prevents early collapse.'
      },
      {
        id: 'mha',
        layer: 'Stage 2 · GRPO Core',
        title: 'Group Advantage RL',
        subtitle: 'Critic-free policy gradient with rule rewards',
        formula: 'A_i = (R_i - mean(R)) / std(R)',
        description: 'Candidate reasoning paths are scored by automated test cases and symbolic math verifiers, normalizing reward variance across output batches.'
      },
      {
        id: 'ffn',
        layer: 'Stage 3 · Distillation',
        title: 'Knowledge Distillation',
        subtitle: 'Distilling reasoning capabilities into smaller models',
        formula: 'L_distill = KL(π_student || π_R1)',
        description: '800k curated reasoning traces from DeepSeek-R1 are distilled directly into 1.5B, 7B, 14B, and 32B student models without RL.'
      }
    ],
    initialChat: {
      welcome: 'DeepSeek-R1 session active. The monograph is indexed with 99.1% grounded provenance. Ask about GRPO, rule-based rewards, or reasoning emergence.',
      citation: {
        section: '§1.0 Abstract & Overview',
        quote: 'DeepSeek-R1-Zero demonstrates that reasoning capabilities naturally emerge through large-scale RL without supervised fine-tuning as a prerequisite.'
      }
    },
    sampleProbes: [
      'How does GRPO avoid training a value network?',
      'Why is rule-based reward superior to RM in math?',
      'Explain the <think> tag emergence in R1-Zero.'
    ]
  },

  cs229: {
    id: 'cs229',
    title: 'Stanford CS229: Machine Learning Foundations',
    type: 'Lecture Series',
    authors: 'Prof. Andrew Ng',
    venue: 'Stanford University (2023)',
    readTime: '24 min',
    groundedScore: 97.6,
    sections: [
      {
        tag: '§ 1.1 Supervised Learning & Linear Regression',
        title: 'LMS Algorithm & Gradient Descent',
        body: 'To perform supervised learning, we define the cost function J(θ) measuring the squared difference between the hypothesis h_θ(x) and ground truth targets y. The batch gradient descent update repeatedly steps in the negative gradient direction across all training examples.'
      },
      {
        tag: '§ 1.2 The Normal Equations',
        title: 'Closed-Form Matrix Derivation',
        body: 'Rather than iterating with gradient descent, the optimal parameters θ that minimize J(θ) can be computed directly in closed form using matrix derivatives and setting the gradient ∇_θ J(θ) to zero.',
        formula: 'θ = (XᵀX)⁻¹ Xᵀy',
        formulaNote: 'Provided X has full column rank, XᵀX is strictly invertible, providing the global minimum in O(d³) algebraic matrix operations.'
      }
    ],
    flashcards: [
      {
        id: 'fc-c1',
        question: 'Under what mathematical conditions is XᵀX not invertible in the Normal Equations?',
        answer: 'XᵀX is non-invertible if features are linearly dependent (collinear) or if the number of features d exceeds the number of training examples m (m < d). Regularization (e.g. Ridge / L2) restores invertibility.',
        citation: 'Lecture Notes 1: Normal Equations (p. 11)',
        interval: '3 days',
        box: 2
      },
      {
        id: 'fc-c2',
        question: 'Compare computational complexity of Batch Gradient Descent vs Normal Equations.',
        answer: 'Normal Equations require O(d³) for matrix inversion where d is feature dimension. Batch Gradient Descent requires O(m · d · iterations), making gradient descent superior when d is very large (e.g. d > 10,000).',
        citation: 'Lecture 1: Computational Comparison (p. 13)',
        interval: '6 days',
        box: 3
      },
      {
        id: 'fc-c3',
        question: 'What is the probabilistic interpretation of least squares cost function J(θ)?',
        answer: 'Assuming independent Gaussian noise ε ~ N(0, σ²) on targets y, minimizing squared error J(θ) is mathematically equivalent to Maximum Likelihood Estimation (MLE) of parameters θ.',
        citation: 'Lecture Notes 1 §3: Probabilistic Interpretation (p. 14)',
        interval: '1 day',
        box: 1
      }
    ],
    conceptNodes: [
      {
        id: 'input',
        layer: 'Phase 1 · Hypothesis',
        title: 'Feature Space & Hypothesis',
        subtitle: 'Linear representation of input vector x',
        formula: 'h_θ(x) = ∑ θ_j x_j = θᵀx',
        description: 'Inputs are mapped to feature vectors with intercept term x_0 = 1, parameterized by weights vector θ.'
      },
      {
        id: 'mha',
        layer: 'Phase 2 · Loss Landscape',
        title: 'Quadratic Cost Function',
        subtitle: 'Convex surface guarantees global minimum',
        formula: 'J(θ) = 1/2 ∑ (h_θ(x^(i)) - y^(i))²',
        description: 'Because the Hessian of J(θ) is positive semi-definite (XᵀX >= 0), the loss surface is strictly convex with no local minima.'
      },
      {
        id: 'ffn',
        layer: 'Phase 3 · Closed Form',
        title: 'Normal Equations Solution',
        subtitle: 'Direct analytical minimization via matrix calculus',
        formula: 'θ* = (XᵀX)⁻¹ Xᵀy',
        description: 'Derived by equating the matrix derivative ∇_θ J(θ) = XᵀXθ - Xᵀy to zero, providing the exact optimal parameter vector in closed form.'
      }
    ],
    initialChat: {
      welcome: 'Stanford CS229 session active. The course literature is indexed with 97.6% grounded provenance. Ask about LMS, Normal Equations, or probabilistic interpretations.',
      citation: {
        section: '§1.0 Supervised Learning Foundations',
        quote: 'Linear regression serves as the fundamental baseline for continuous value prediction and introduces key concepts of cost minimization.'
      }
    },
    sampleProbes: [
      'When does XᵀX fail to be invertible?',
      'Why is least squares equivalent to Gaussian MLE?',
      'Compare Batch Gradient Descent vs Normal Equations.'
    ]
  }
};

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citation?: {
    section: string;
    quote: string;
  };
}

export default function LearnabilityLandingAndStudio() {
  const router = useRouter();

  // Active studio state
  const [activeDocKey, setActiveDocKey] = useState<string>('vaswani');
  const [activeMode, setActiveMode] = useState<StudyMode>('read');

  // Text selection popover state
  const [selectionPopover, setSelectionPopover] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  // Command palette & Ingestion modals
  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [ingestType, setIngestType] = useState<'pdf' | 'arxiv' | 'youtube' | 'topic'>('pdf');
  const [ingestInput, setIngestInput] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestStep, setIngestStep] = useState(0);

  const doc = DOC_PRESETS[activeDocKey];

  // Socratic dialogue state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Active Recall state
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);

  // Active Concept Node state in Diagram view
  const [activeConceptNode, setActiveConceptNode] = useState<string>('mha');

  // Guest pass / Auth Gate Modal state
  const [isGeneratingPass, setIsGeneratingPass] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Listen for open-auth-modal events or URL query ?auth=login
  useEffect(() => {
    const handleOpenAuth = () => {
      setAuthError(null);
      setIsAuthModalOpen(true);
    };
    window.addEventListener('open-auth-modal', handleOpenAuth);
    if (typeof window !== 'undefined' && window.location.search.includes('auth=')) {
      setIsAuthModalOpen(true);
    }
    return () => window.removeEventListener('open-auth-modal', handleOpenAuth);
  }, []);

  // Initialize or reset chat and cards when doc changes
  useEffect(() => {
    setChatMessages([
      {
        id: `m-init-${doc.id}`,
        sender: 'assistant',
        text: doc.initialChat.welcome,
        citation: doc.initialChat.citation
      }
    ]);
    setCardIndex(0);
    setIsFlipped(false);
    setActiveConceptNode('mha');
  }, [activeDocKey]);

  const activeCard = doc.flashcards[cardIndex] || doc.flashcards[0];
  const activeNode = doc.conceptNodes.find((n) => n.id === activeConceptNode) || doc.conceptNodes[0];

  // Global keyboard shortcuts (Escape to close modals)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsIngestOpen(false);
        setSelectionPopover(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle text selection in reader
  const handleReaderMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setSelectionPopover(null);
      return;
    }
    const text = selection.toString().trim();
    if (text.length < 4) {
      setSelectionPopover(null);
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionPopover({
        text,
        x: Math.max(16, rect.left + rect.width / 2),
        y: rect.top - 12
      });
    } catch {
      setSelectionPopover(null);
    }
  };

  // Trigger Socratic question from selection
  const handleExplainSelection = (customQuery?: string) => {
    const query =
      customQuery ||
      (selectionPopover ? `Can you explain the mathematical significance of "${selectionPopover.text}" in detail?` : '');
    if (!query) return;

    setActiveMode('interrogate');
    setSelectionPopover(null);
    handleSendMessage(query);
  };

  // Submit message to Socratic Tutor
  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsThinking(true);

    setTimeout(() => {
      let replyText = '';
      let replyCitation = {
        section: doc.sections[0]?.tag || '§ Literature Source',
        quote: doc.sections[0]?.body.slice(0, 110) + '...'
      };

      const lower = query.toLowerCase();
      if (lower.includes('scale') || lower.includes('root') || lower.includes('variance') || lower.includes('d_k')) {
        replyText =
          'The scaling factor 1/√d_k is mathematically critical. When d_k is large, the dot products grow large, pushing the softmax function into regions of extremely small gradients. Multiplying by 1/√d_k scales the variance back to 1 and stabilizes gradient propagation.';
        replyCitation = {
          section: '§ 3.2.1 Scaled Dot-Product Attention',
          quote: 'To illustrate why the dot products get large, assume that components of q and k are independent random variables with mean 0 and variance 1. Then their dot product has mean 0 and variance d_k.'
        };
      } else if (lower.includes('grpo') || lower.includes('critic') || lower.includes('reward')) {
        replyText =
          'Group Relative Policy Optimization (GRPO) bypasses the memory-intensive critic model by sampling multiple responses for each question and using the empirical group mean as the baseline. Advantages are normalized directly via A_i = (R_i - mean(R)) / std(R).';
        replyCitation = {
          section: '§ 3.1 Group Relative Policy Optimization',
          quote: 'For each question q, GRPO samples a group of outputs {o_1, o_2, ..., o_G} from the old policy and optimizes the policy model by maximizing group relative advantage.'
        };
      } else if (lower.includes('normal') || lower.includes('invert') || lower.includes('lms') || lower.includes('gradient')) {
        replyText =
          'The Normal Equations θ = (XᵀX)⁻¹ Xᵀy provide the analytical solution where ∇_θ J(θ) = 0. If features are collinear or m < d, XᵀX is singular and cannot be inverted, in which case Batch Gradient Descent or L2 ridge regularization must be applied.';
        replyCitation = {
          section: '§ 1.2 The Normal Equations & Invertibility',
          quote: 'Provided X has full column rank, XᵀX is invertible. If XᵀX is non-invertible, the pseudoinverse pinv(XᵀX) provides the minimum-norm least squares solution.'
        };
      } else if (lower.includes('complexity') || lower.includes('o(1)') || lower.includes('rnn') || lower.includes('path')) {
        replyText =
          'In recurrent layers (RNNs), passing information between two distant positions requires O(n) sequential steps. In Self-Attention, the maximum path length between any two words is strictly O(1), allowing gradients to propagate directly without sequential degradation.';
        replyCitation = {
          section: '§ 4.0 Table 1: Maximum Path Lengths',
          quote: 'Self-Attention layer: O(1) sequential operations, O(n² · d) complexity per layer, O(1) maximum path length.'
        };
      } else {
        replyText = `Based on grounded analysis of ${doc.title}: this mechanism decouples sequence transformation from recurrent state tracking. The attention weights dynamically construct a weighted adjacency matrix over the entire context window in parallel.`;
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          text: replyText,
          citation: replyCitation
        }
      ]);
      setIsThinking(false);
    }, 650);
  };

  // Real User Authentication Submit (Login or Register)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmittingAuth(true);

    try {
      if (authMode === 'login') {
        const res = await api.login({ email: authEmail.trim(), password: authPassword });
        if (res?.token) {
          authStorage.setToken(res.token);
          setIsAuthModalOpen(false);
          router.push('/dashboard');
        } else {
          throw new Error('Authentication failed: no token received from server');
        }
      } else {
        const res = await api.register({
          email: authEmail.trim(),
          password: authPassword,
          name: authName.trim() || undefined,
        });
        if (res?.token) {
          authStorage.setToken(res.token);
          setIsAuthModalOpen(false);
          router.push('/dashboard');
        } else {
          throw new Error('Registration failed: no token received from server');
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please check credentials or backend availability.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // 1-Click Scholar Pass (authenticates with backend as real demo scholar user)
  const handleQuickScholarPass = async () => {
    setIsGeneratingPass(true);
    setAuthError(null);
    try {
      let auth;
      try {
        auth = await api.login({ email: 'scholar@learnability.pro', password: 'password123' });
      } catch {
        auth = await api.register({ email: 'scholar@learnability.pro', password: 'password123', name: 'Dr. Scholar' });
      }
      if (auth?.token) {
        authStorage.setToken(auth.token);
        setIsAuthModalOpen(false);
        router.push('/dashboard');
      } else {
        throw new Error('Failed to obtain authenticated token from server');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Scholar pass generation failed. Please sign in manually.');
      setIsAuthModalOpen(true);
    } finally {
      setIsGeneratingPass(false);
    }
  };

  // Ingestion mock submission with progressive 4-phase indexing telemetry
  const handleIngestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestInput.trim()) return;

    setIsIngesting(true);
    setIngestStep(1);

    const t1 = setTimeout(() => setIngestStep(2), 250);
    const t2 = setTimeout(() => setIngestStep(3), 500);
    const t3 = setTimeout(() => {
      setIngestStep(4);
      setTimeout(() => {
        setIsIngesting(false);
        setIsIngestOpen(false);
        setIngestInput('');
        setIngestStep(0);
        setActiveDocKey('deepseek');
        setActiveMode('read');
        const studioElem = document.getElementById('live-studio');
        if (studioElem) studioElem.scrollIntoView({ behavior: 'smooth' });
      }, 350);
    }, 750);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  };

  return (
    <div className="min-h-screen bg-canvas text-ink-primary font-sans antialiased selection:bg-accent-cyan/20 selection:text-ink-primary">
      {/* ========================================================= */}
      {/* 1. BRAND HERO SECTION: MISSION & POSITIONING              */}
      {/* ========================================================= */}
      <section className="relative overflow-hidden border-b border-rule-border pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-5xl mx-auto px-4 text-center">
          {/* Brand Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-rule-border bg-surface-elevated text-xs font-mono text-ink-muted mb-8 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse"></span>
            <span className="text-ink-primary font-medium">Learnability Pro</span>
            <span className="text-rule-strong">·</span>
            <span>Multimodal Cognitive Deep-Work Studio</span>
          </div>

          {/* Core Brand Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-ink-primary mb-6 leading-tight max-w-4xl mx-auto">
            Transform Dense Literature Into <br className="hidden sm:inline" />
            <span className="text-accent-cyan">Permanent Comprehension.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-ink-body max-w-2xl mx-auto mb-10 leading-relaxed">
            Generic AI chat produces detached summaries that hallucinate. Learnability Pro pairs source literature with structured cognitive primitives: grounded Socratic interrogation, visual concept hierarchies, and active recall drills.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 font-mono text-xs">
            <a
              href="#live-studio"
              className="px-5 py-3 rounded-lg bg-accent-cyan text-slate-950 font-bold hover:bg-accent-cyan/90 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>Test-Drive Live Studio Below</span>
              <ArrowDown className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={handleQuickScholarPass}
              disabled={isGeneratingPass}
              className="px-5 py-3 rounded-lg border border-rule-border bg-surface hover:bg-surface-elevated text-ink-primary font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <GraduationCap className="w-4 h-4 text-accent-cyan" />
              <span>{isGeneratingPass ? 'Entering Studio...' : '1-Click Scholar Pass'}</span>
            </button>

            <a
              href="#modalities"
              className="px-4 py-3 rounded-lg text-ink-muted hover:text-ink-primary transition-colors flex items-center gap-1.5"
            >
              <span>Explore The 4 Learning Primitives</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Core Trust Badges */}
          <div className="mt-14 pt-8 border-t border-rule-border grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
            <div className="p-3 rounded-lg bg-surface border border-rule-border">
              <div className="text-xs font-mono text-accent-cyan font-semibold mb-1">0% Hallucination</div>
              <div className="text-[11px] text-ink-muted">Strict source-anchored mathematical provenance</div>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-rule-border">
              <div className="text-xs font-mono text-accent-cyan font-semibold mb-1">Multi-Modal</div>
              <div className="text-[11px] text-ink-muted">PDF Papers, arXiv DOIs, YouTube & Topics</div>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-rule-border">
              <div className="text-xs font-mono text-accent-cyan font-semibold mb-1">Mermaid DAGs</div>
              <div className="text-[11px] text-ink-muted">Concept relationship trees and prerequisite maps</div>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-rule-border">
              <div className="text-xs font-mono text-accent-cyan font-semibold mb-1">Leitner Recall</div>
              <div className="text-[11px] text-ink-muted">4-box spaced repetition for long-term retention</div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. THE 4 MODALITIES OF LEARNING IN OUR APPLICATION         */}
      {/* ========================================================= */}
      <section id="modalities" className="py-20 border-b border-rule-border bg-surface/40">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-mono uppercase tracking-wider text-accent-cyan font-semibold">
              The Cognitive Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-ink-primary mt-2 mb-3">
              Four Deliberate Stages of True Mastery
            </h2>
            <p className="text-sm text-ink-body">
              How Learnability Pro takes you from raw information to fluent, long-term conceptual recall.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Modality 1: Multi-Modal Ingestion */}
            <div className="p-6 rounded-xl border border-rule-border bg-surface hover:border-rule-strong transition-all flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-accent-cyan mb-4">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="text-xs font-mono text-accent-cyan font-semibold mb-1">Stage 01 · Ingestion</div>
                <h3 className="text-lg font-bold text-ink-primary mb-2">
                  Topic, PDF & YouTube Ingestion
                </h3>
                <p className="text-xs text-ink-body leading-relaxed mb-4">
                  Ingest textbooks, slide decks, arXiv papers, or video lecture transcripts. Materials are tokenized and indexed into 1536-dimensional vector space with exact paragraph and equation anchors.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-canvas border border-rule-border font-mono text-[11px] text-ink-muted flex items-center justify-between">
                <span>Supports: PDF, arXiv DOI, YouTube URLs, Curated Topics</span>
                <span className="text-accent-emerald flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              </div>
            </div>

            {/* Modality 2: Grounded Socratic Interrogation */}
            <div className="p-6 rounded-xl border border-rule-border bg-surface hover:border-rule-strong transition-all flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-accent-cyan mb-4">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="text-xs font-mono text-accent-cyan font-semibold mb-1">Stage 02 · Interrogation</div>
                <h3 className="text-lg font-bold text-ink-primary mb-2">
                  Socratic Interrogation & Probe Sessions
                </h3>
                <p className="text-xs text-ink-body leading-relaxed mb-4">
                  Reading alone is passive. The Socratic tutor actively challenges your reasoning, asking targeted probe questions on mathematical steps, trade-offs, and proofs—with zero detached hallucination.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-canvas border border-rule-border font-mono text-[11px] text-ink-muted flex items-center justify-between">
                <span>100% Grounded citations with section & page markers</span>
                <span className="text-accent-cyan font-semibold">Live Probing</span>
              </div>
            </div>

            {/* Modality 3: Visual Concept Hierarchies & Diagrams */}
            <div className="p-6 rounded-xl border border-rule-border bg-surface hover:border-rule-strong transition-all flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-accent-cyan mb-4">
                  <Network className="w-4 h-4" />
                </div>
                <div className="text-xs font-mono text-accent-cyan font-semibold mb-1">Stage 03 · Visual Hierarchy</div>
                <h3 className="text-lg font-bold text-ink-primary mb-2">
                  Mermaid Concept Trees & Relationship DAGs
                </h3>
                <p className="text-xs text-ink-body leading-relaxed mb-4">
                  Understand complex topics through architectural relationships. Automatic Mermaid diagrams map dependencies, architectural layers, and cross-attention connections so you see the big picture.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-canvas border border-rule-border font-mono text-[11px] text-ink-muted flex items-center justify-between">
                <span>Dynamic directed acyclic graphs & concept maps</span>
                <span className="text-accent-cyan font-semibold">Mermaid.js</span>
              </div>
            </div>

            {/* Modality 4: Leitner Spaced Repetition Flashcards */}
            <div className="p-6 rounded-xl border border-rule-border bg-surface hover:border-rule-strong transition-all flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-accent-cyan mb-4">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div className="text-xs font-mono text-accent-cyan font-semibold mb-1">Stage 04 · Long-Term Retention</div>
                <h3 className="text-lg font-bold text-ink-primary mb-2">
                  Leitner Active Recall Spaced Repetition
                </h3>
                <p className="text-xs text-ink-body leading-relaxed mb-4">
                  Convert key concepts into structured flashcards generated straight from literature. The 4-box Leitner system schedules reviews (1d, 3d, 6d, 14d) to guarantee permanent memory consolidation.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-canvas border border-rule-border font-mono text-[11px] text-ink-muted flex items-center justify-between">
                <span>Adaptive Leitner interval scheduling</span>
                <span className="text-accent-emerald flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3 h-3" /> High Retention
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. INTERACTIVE LIVE STUDY STUDIO SANDBOX                  */}
      {/* ========================================================= */}
      <section id="live-studio" className="py-16">
        <div className="max-w-5xl mx-auto px-4">
          {/* Studio Header Bar */}
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-xs font-mono uppercase tracking-wider text-accent-cyan font-semibold">
              Live Product Experience
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-ink-primary mt-1 mb-2">
              The Distraction-Free Study Studio
            </h2>
            <p className="text-xs text-ink-muted font-mono">
              Test-drive all 4 learning modalities right here with {doc.title}
            </p>
          </div>

          {/* Studio Controls Header */}
          <div className="border border-rule-border rounded-t-xl bg-surface p-3 flex flex-wrap items-center justify-between gap-3">
            {/* Preset Document Switcher */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-ink-muted hidden sm:inline">Literature:</span>
              <select
                value={activeDocKey}
                onChange={(e) => setActiveDocKey(e.target.value)}
                className="bg-surface-elevated border border-rule-border text-ink-primary text-xs rounded-md px-2.5 py-1.5 font-mono focus:outline-none focus:border-accent-cyan transition-colors cursor-pointer"
              >
                <option value="vaswani">Vaswani et al. (2017) · Attention Is All You Need</option>
                <option value="deepseek">DeepSeek-R1 (2025) · Reasoning via RL</option>
                <option value="cs229">Stanford CS229 · Machine Learning Foundations</option>
              </select>
            </div>

            {/* Studio Mode Switcher */}
            <div className="flex items-center bg-surface-elevated p-1 rounded-lg border border-rule-border">
              <button
                onClick={() => setActiveMode('read')}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeMode === 'read'
                    ? 'bg-canvas text-accent-cyan shadow-sm border border-rule-border font-medium'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>1. Read</span>
              </button>

              <button
                onClick={() => setActiveMode('interrogate')}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeMode === 'interrogate'
                    ? 'bg-canvas text-accent-cyan shadow-sm border border-rule-border font-medium'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>2. Socratic Chat</span>
              </button>

              <button
                onClick={() => setActiveMode('diagram')}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeMode === 'diagram'
                    ? 'bg-canvas text-accent-cyan shadow-sm border border-rule-border font-medium'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>3. Concept Tree</span>
              </button>

              <button
                onClick={() => setActiveMode('recall')}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeMode === 'recall'
                    ? 'bg-canvas text-accent-cyan shadow-sm border border-rule-border font-medium'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>4. Recall ({doc.flashcards.length})</span>
              </button>
            </div>

            {/* Ingestion Trigger Button */}
            <button
              onClick={() => setIsIngestOpen(true)}
              className="px-3 py-1.5 text-xs font-mono rounded-md bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/30 text-accent-cyan font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ingest New Material</span>
            </button>
          </div>

          {/* Studio Container */}
          <div className="border-x border-b border-rule-border rounded-b-xl bg-canvas p-6 sm:p-8 min-h-[520px]">
            {/* --------------------------------------------------------- */}
            {/* MODE 1: FOCUS READ (Distraction-Free Sanctuary)            */}
            {/* --------------------------------------------------------- */}
            {activeMode === 'read' && (
              <div className="max-w-2xl mx-auto" onMouseUp={handleReaderMouseUp}>
                <div className="mb-8 pb-4 border-b border-rule-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
                      {doc.type}
                    </span>
                    <span className="text-xs text-ink-muted font-mono">{doc.venue}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-primary mb-2">
                    {doc.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs font-mono text-ink-muted">
                    <span className="text-accent-emerald flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {doc.groundedScore}% Grounded Provenance
                    </span>
                    <span>·</span>
                    <span className="text-ink-subtle">Highlight any sentence to summon Scholar AI</span>
                  </div>
                </div>

                <article className="space-y-6 text-[15px] leading-relaxed text-ink-body">
                  {doc.sections.map((sec, idx) => (
                    <section key={idx} className={sec.formula ? "p-4 rounded-lg bg-surface border border-rule-border" : ""}>
                      <div className="text-xs font-mono text-accent-cyan font-semibold mb-1">
                        {sec.tag}
                      </div>
                      <p className="text-sm text-ink-body leading-relaxed mb-2">
                        {sec.body}
                      </p>
                      {sec.formula && (
                        <div className="my-3 p-3 rounded bg-canvas border border-rule-border text-center font-mono text-sm text-ink-primary font-medium">
                          {sec.formula}
                        </div>
                      )}
                      {sec.formulaNote && (
                        <p className="text-xs text-ink-muted">
                          {sec.formulaNote}
                        </p>
                      )}
                    </section>
                  ))}

                  {/* Fast Jump CTAs */}
                  <div className="pt-4 flex items-center justify-between border-t border-rule-border">
                    <button
                      onClick={() => {
                        setActiveMode('interrogate');
                        handleSendMessage(doc.sampleProbes[0] || 'Explain the mathematical foundation of this section.');
                      }}
                      className="text-xs font-mono text-accent-cyan hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Ask Socratic AI about §1</span>
                    </button>
                    <button
                      onClick={() => setActiveMode('diagram')}
                      className="text-xs font-mono text-ink-muted hover:text-ink-primary flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Concept Relationship Tree</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </article>

                {/* Contextual Floating Selection Popover */}
                {selectionPopover && (
                  <div
                    style={{
                      position: 'fixed',
                      left: `${selectionPopover.x}px`,
                      top: `${selectionPopover.y}px`,
                      transform: 'translate(-50%, -100%)'
                    }}
                    className="z-50 bg-surface-elevated border border-rule-border shadow-2xl rounded-lg p-1.5 flex items-center gap-1 text-xs font-mono animate-in fade-in zoom-in-95 duration-150"
                  >
                    <button
                      onClick={() => handleExplainSelection()}
                      className="px-2.5 py-1 rounded bg-accent-cyan/10 hover:bg-accent-cyan/20 text-accent-cyan flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Explain with AI</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveMode('recall');
                        setSelectionPopover(null);
                      }}
                      className="px-2.5 py-1 rounded hover:bg-surface text-ink-muted hover:text-ink-primary flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Flashcard</span>
                    </button>
                    <button
                      onClick={() => setSelectionPopover(null)}
                      className="p-1 rounded hover:bg-surface text-ink-muted hover:text-ink-primary cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* --------------------------------------------------------- */}
            {/* MODE 2: SOCRATIC CHAT & PROBE SESSIONS                    */}
            {/* --------------------------------------------------------- */}
            {activeMode === 'interrogate' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Left: Anchored Reference */}
                <div className="rounded-xl border border-rule-border bg-surface p-5 text-sm max-h-[480px] overflow-y-auto">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-rule-border font-mono text-xs text-ink-muted">
                    <span className="font-semibold text-ink-primary">Grounded Document Excerpt</span>
                    <span className="text-accent-emerald flex items-center gap-1 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" /> {doc.groundedScore}% Provenance
                    </span>
                  </div>
                  <div className="space-y-3 text-xs leading-relaxed text-ink-body">
                    {doc.sections.map((sec, idx) => (
                      <div key={idx} className="p-3 rounded bg-surface-elevated border border-rule-border">
                        <div className="font-bold text-accent-cyan mb-1">{sec.tag}</div>
                        <p>{sec.body}</p>
                        {sec.formula && (
                          <div className="my-2 p-2 rounded bg-canvas font-mono text-center text-ink-primary text-[11px]">
                            {sec.formula}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Dialogue Box */}
                <div className="rounded-xl border border-rule-border bg-surface flex flex-col h-[480px]">
                  <div className="px-4 py-3 border-b border-rule-border font-mono text-xs flex items-center justify-between">
                    <span className="font-semibold text-ink-primary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
                      Socratic Tutor
                    </span>
                    <span className="text-ink-muted text-[11px]">Strict Verification Active</span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[90%] rounded-lg p-3 text-xs leading-relaxed ${
                            msg.sender === 'user'
                              ? 'bg-accent-cyan text-slate-950 font-medium'
                              : 'bg-surface-elevated text-ink-body border border-rule-border'
                          }`}
                        >
                          {msg.text}
                        </div>
                        {msg.citation && (
                          <div className="mt-1.5 max-w-[90%] rounded bg-canvas border border-rule-border p-2 text-[11px] font-mono text-ink-muted">
                            <span className="text-accent-emerald font-semibold block mb-0.5">
                              ✓ {msg.citation.section}
                            </span>
                            <span className="italic text-ink-subtle">&quot;{msg.citation.quote}&quot;</span>
                          </div>
                        )}
                      </div>
                    ))}

                    {isThinking && (
                      <div className="flex items-center gap-2 text-xs font-mono text-ink-muted p-2">
                        <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse"></span>
                        <span>Retrieving verified document citations...</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Probe Prompts */}
                  <div className="px-3 py-2 border-t border-rule-border flex gap-2 overflow-x-auto text-[11px] font-mono">
                    {doc.sampleProbes.map((probe, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(probe)}
                        className="px-2.5 py-1 rounded-full border border-rule-border hover:border-accent-cyan bg-canvas text-ink-muted hover:text-ink-primary whitespace-nowrap transition-colors cursor-pointer"
                      >
                        {probe}
                      </button>
                    ))}
                  </div>

                  {/* Input Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="p-3 border-t border-rule-border flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={inputQuery}
                      onChange={(e) => setInputQuery(e.target.value)}
                      placeholder="Ask a technical or mathematical question..."
                      className="flex-1 bg-canvas border border-rule-border rounded-md px-3 py-2 text-xs text-ink-primary focus:outline-none focus:border-accent-cyan font-sans"
                    />
                    <button
                      type="submit"
                      disabled={!inputQuery.trim() || isThinking}
                      className="p-2 rounded-md bg-accent-cyan text-slate-950 hover:bg-accent-cyan/90 disabled:opacity-40 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------- */}
            {/* MODE 3: CONCEPT TREE & RELATIONSHIP HIERARCHY             */}
            {/* --------------------------------------------------------- */}
            {activeMode === 'diagram' && (
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between pb-3 mb-6 border-b border-rule-border font-mono text-xs text-ink-muted">
                  <span className="font-semibold text-ink-primary flex items-center gap-1.5">
                    <Network className="w-3.5 h-3.5 text-accent-cyan" />
                    Concept Relationship DAG · {doc.title}
                  </span>
                  <span className="text-[11px] text-accent-cyan">Interactive Nodes</span>
                </div>

                {/* Visual Concept Flowchart Nodes */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                    {doc.conceptNodes.map((node) => (
                      <button
                        key={node.id}
                        onClick={() => setActiveConceptNode(node.id)}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                          activeConceptNode === node.id
                            ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan shadow-md'
                            : 'border-rule-border bg-surface text-ink-muted hover:text-ink-primary hover:border-rule-strong'
                        }`}
                      >
                        <div className="text-[10px] text-ink-muted uppercase mb-1">{node.layer}</div>
                        <div className="font-bold text-sm mb-1 text-ink-primary">{node.title}</div>
                        <div className="text-[11px] leading-tight">{node.subtitle}</div>
                      </button>
                    ))}
                  </div>

                  {/* Relationship Inspector Box */}
                  <div className="p-5 rounded-xl border border-rule-border bg-surface font-mono text-xs">
                    <div className="text-ink-muted text-[11px] mb-2 uppercase tracking-wider">
                      Selected Node & Structural Verification:
                    </div>
                    <div>
                      <div className="font-bold text-ink-primary text-sm mb-1">
                        {activeNode.title}: {activeNode.formula}
                      </div>
                      <p className="text-ink-body font-sans text-xs leading-relaxed mt-2">
                        {activeNode.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------- */}
            {/* MODE 4: ACTIVE RECALL (Leitner Flashcard Drill)           */}
            {/* --------------------------------------------------------- */}
            {activeMode === 'recall' && (
              <div className="max-w-xl mx-auto py-4">
                <div className="flex items-center justify-between text-xs font-mono text-ink-muted mb-4">
                  <span className="flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-accent-cyan" />
                    <span>Leitner Deck: {doc.title}</span>
                  </span>
                  <span>Card {cardIndex + 1} of {doc.flashcards.length} · Mastered: {masteredCount}</span>
                </div>

                {/* 3D Flip Card */}
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="w-full min-h-[220px] p-6 rounded-xl bg-surface border border-rule-border hover:border-rule-strong cursor-pointer transition-all flex flex-col justify-between shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted mb-3">
                      <span className="px-2 py-0.5 rounded bg-surface-elevated border border-rule-border">
                        {isFlipped ? 'Answer & Proof' : 'Active Recall Prompt'}
                      </span>
                      <span className="text-accent-cyan">Click to {isFlipped ? 'hide' : 'reveal'}</span>
                    </div>
                    <div className="text-base font-medium text-ink-primary leading-relaxed">
                      {isFlipped ? activeCard.answer : activeCard.question}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-rule-border flex items-center justify-between text-xs font-mono text-ink-muted">
                    <span className="text-accent-emerald flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {activeCard.citation}
                    </span>
                    <span>Box {activeCard.box} ({activeCard.interval})</span>
                  </div>
                </div>

                {/* Leitner Grading Buttons */}
                {isFlipped ? (
                  <div className="mt-4 flex items-center gap-2 font-mono text-xs">
                    <button
                      onClick={() => {
                        setIsFlipped(false);
                        setCardIndex((prev) => (prev + 1) % doc.flashcards.length);
                      }}
                      className="flex-1 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-center cursor-pointer transition-colors"
                    >
                      Again (1d)
                    </button>
                    <button
                      onClick={() => {
                        setIsFlipped(false);
                        setCardIndex((prev) => (prev + 1) % doc.flashcards.length);
                      }}
                      className="flex-1 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-center cursor-pointer transition-colors"
                    >
                      Hard (3d)
                    </button>
                    <button
                      onClick={() => {
                        setIsFlipped(false);
                        setMasteredCount((m) => m + 1);
                        setCardIndex((prev) => (prev + 1) % doc.flashcards.length);
                      }}
                      className="flex-1 py-2 rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20 text-center cursor-pointer transition-colors"
                    >
                      Good (6d)
                    </button>
                    <button
                      onClick={() => {
                        setIsFlipped(false);
                        setMasteredCount((m) => m + 1);
                        setCardIndex((prev) => (prev + 1) % doc.flashcards.length);
                      }}
                      className="flex-1 py-2 rounded-lg border border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald hover:bg-accent-emerald/20 text-center cursor-pointer transition-colors"
                    >
                      Easy (14d)
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 text-center text-xs font-mono text-ink-muted">
                    Click the card to reveal the answer and grade your retention
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. FINAL CALL TO ACTION                                   */}
      {/* ========================================================= */}
      <section className="py-20 border-t border-rule-border bg-surface text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink-primary mb-3">
            Ready for Rigorous, Distraction-Free Study?
          </h2>
          <p className="text-sm text-ink-body mb-8 max-w-xl mx-auto leading-relaxed">
            Ingest your own research PDFs, YouTube lecture playlists, or technical topics and experience verifiable cognitive acceleration.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 font-mono text-xs">
            <button
              onClick={handleQuickScholarPass}
              disabled={isGeneratingPass}
              className="px-6 py-3 rounded-lg bg-accent-cyan text-slate-950 font-bold hover:bg-accent-cyan/90 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              <span>{isGeneratingPass ? 'Entering Studio...' : 'Launch Scholar Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsIngestOpen(true)}
              className="px-6 py-3 rounded-lg border border-rule-border bg-surface-elevated hover:bg-canvas text-ink-primary font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Upload className="w-4 h-4 text-accent-cyan" />
              <span>Ingest Document</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* QUICK INGESTION MODAL                                     */}
      {/* ========================================================= */}
      {isIngestOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-rule-border rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-rule-border mb-4">
              <h3 className="text-sm font-semibold text-ink-primary font-mono">
                Ingest Research Material
              </h3>
              <button
                onClick={() => setIsIngestOpen(false)}
                className="text-ink-muted hover:text-ink-primary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex rounded-lg border border-rule-border p-1 bg-surface-elevated mb-4 text-xs font-mono">
              <button
                type="button"
                onClick={() => setIngestType('pdf')}
                className={`flex-1 py-1 rounded cursor-pointer transition-colors ${
                  ingestType === 'pdf' ? 'bg-canvas text-accent-cyan font-medium' : 'text-ink-muted'
                }`}
              >
                PDF
              </button>
              <button
                type="button"
                onClick={() => setIngestType('arxiv')}
                className={`flex-1 py-1 rounded cursor-pointer transition-colors ${
                  ingestType === 'arxiv' ? 'bg-canvas text-accent-cyan font-medium' : 'text-ink-muted'
                }`}
              >
                arXiv
              </button>
              <button
                type="button"
                onClick={() => setIngestType('youtube')}
                className={`flex-1 py-1 rounded cursor-pointer transition-colors ${
                  ingestType === 'youtube' ? 'bg-canvas text-accent-cyan font-medium' : 'text-ink-muted'
                }`}
              >
                YouTube
              </button>
              <button
                type="button"
                onClick={() => setIngestType('topic')}
                className={`flex-1 py-1 rounded cursor-pointer transition-colors ${
                  ingestType === 'topic' ? 'bg-canvas text-accent-cyan font-medium' : 'text-ink-muted'
                }`}
              >
                Topic
              </button>
            </div>

            <form onSubmit={handleIngestSubmit} className="space-y-4">
              {ingestType === 'pdf' && (
                <div className="border border-dashed border-rule-border hover:border-accent-cyan rounded-lg p-6 text-center text-xs font-mono text-ink-muted cursor-pointer transition-colors">
                  <Upload className="w-6 h-6 mx-auto mb-2 text-accent-cyan" />
                  <p>Drop PDF paper here or click to select</p>
                  <p className="text-[10px] text-ink-subtle mt-1">Supports mathematical OCR & 1536-dim vector indexing</p>
                </div>
              )}

              <input
                type="text"
                value={ingestInput}
                onChange={(e) => setIngestInput(e.target.value)}
                placeholder={
                  ingestType === 'arxiv'
                    ? 'e.g. 2501.12948 or arXiv URL'
                    : ingestType === 'youtube'
                    ? 'e.g. https://www.youtube.com/watch?v=...'
                    : 'Study title or subject...'
                }
                className="w-full bg-canvas border border-rule-border rounded-md px-3 py-2 text-xs font-mono text-ink-primary focus:outline-none focus:border-accent-cyan"
              />

              {/* 4-Phase Indexing Telemetry */}
              {isIngesting && (
                <div className="space-y-1.5 font-mono text-[11px] py-1">
                  <div className={`p-2 rounded border transition-all ${ingestStep >= 1 ? 'border-accent-cyan text-accent-cyan bg-accent-cyan/10' : 'border-rule-border text-ink-muted'}`}>
                    1. Text Tokenization & OCR Verification
                  </div>
                  <div className={`p-2 rounded border transition-all ${ingestStep >= 2 ? 'border-accent-cyan text-accent-cyan bg-accent-cyan/10' : 'border-rule-border text-ink-muted'}`}>
                    2. Semantic Chunking & Equation Extraction
                  </div>
                  <div className={`p-2 rounded border transition-all ${ingestStep >= 3 ? 'border-accent-cyan text-accent-cyan bg-accent-cyan/10' : 'border-rule-border text-ink-muted'}`}>
                    3. Vector Embedding (1536-dim)
                  </div>
                  <div className={`p-2 rounded border transition-all ${ingestStep >= 4 ? 'border-accent-emerald text-accent-emerald bg-accent-emerald/10' : 'border-rule-border text-ink-muted'}`}>
                    4. Study Sanctuary Ready
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsIngestOpen(false)}
                  className="px-3 py-1.5 text-xs font-mono rounded-md border border-rule-border hover:bg-surface-elevated text-ink-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isIngesting}
                  className="px-4 py-1.5 text-xs font-mono rounded-md bg-accent-cyan text-slate-950 font-semibold hover:bg-accent-cyan/90 cursor-pointer disabled:opacity-50"
                >
                  {isIngesting ? 'Indexing Embeddings...' : 'Index & Open Studio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* AUTHENTICATION GATE MODAL                                 */}
      {/* ========================================================= */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface border border-rule-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded text-[11px] font-mono bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Scholar Authentication Gate</span>
                </div>
                <h3 className="text-lg font-bold text-ink-primary">
                  {authMode === 'login' ? 'Sign In to Study Sanctuary' : 'Create Scholar Account'}
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Access your persistent research corpus, live LLM Socratic streaming, and Leitner recall.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAuthModalOpen(false);
                  setAuthError(null);
                }}
                className="p-1 rounded-md text-ink-muted hover:text-ink-primary hover:bg-surface-elevated transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 rounded-lg bg-surface-elevated p-1 border border-rule-border text-xs font-mono">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError(null);
                }}
                className={`py-1.5 rounded-md transition-all cursor-pointer font-medium ${
                  authMode === 'login'
                    ? 'bg-canvas text-accent-cyan shadow-sm border border-rule-border'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setAuthError(null);
                }}
                className={`py-1.5 rounded-md transition-all cursor-pointer font-medium ${
                  authMode === 'register'
                    ? 'bg-canvas text-accent-cyan shadow-sm border border-rule-border'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Banner */}
            {authError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono leading-relaxed">
                {authError}
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authMode === 'register' && (
                <div>
                  <label className="block text-[11px] font-mono text-ink-muted mb-1 uppercase font-semibold">
                    Full Name / Title
                  </label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="e.g. Dr. Ada Lovelace"
                    className="w-full bg-canvas border border-rule-border rounded-lg px-3.5 py-2 text-xs text-ink-primary focus:outline-none focus:border-accent-cyan font-sans"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono text-ink-muted mb-1 uppercase font-semibold">
                  Academic Email
                </label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="scholar@university.edu"
                  className="w-full bg-canvas border border-rule-border rounded-lg px-3.5 py-2 text-xs text-ink-primary focus:outline-none focus:border-accent-cyan font-sans"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-ink-muted mb-1 uppercase font-semibold">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-canvas border border-rule-border rounded-lg px-3.5 py-2 text-xs text-ink-primary focus:outline-none focus:border-accent-cyan font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full py-2.5 rounded-lg bg-accent-cyan text-slate-950 font-bold hover:bg-accent-cyan/90 transition-all font-mono text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-cyan-500/20 disabled:opacity-50"
              >
                {isSubmittingAuth ? (
                  <span>Authenticating...</span>
                ) : authMode === 'login' ? (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>Create Account & Enter Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Scholar Pass */}
            <div className="pt-2 border-t border-rule-border space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-center text-ink-muted">
                or instant access with verified credentials
              </div>
              <button
                type="button"
                onClick={handleQuickScholarPass}
                disabled={isGeneratingPass}
                className="w-full py-2 rounded-lg border border-rule-border bg-surface-elevated hover:bg-surface text-ink-primary font-mono text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                <GraduationCap className="w-4 h-4 text-accent-cyan" />
                <span>{isGeneratingPass ? 'Generating Scholar Pass...' : '1-Click Scholar Pass (Test Account)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
