import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../core/widgets/app_logo.dart';

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _questionController = TextEditingController();
  final _scrollController = ScrollController();
  int _selectedMarks = 5;
  bool _loading = false;
  bool _copied = false;
  bool _saved = false;
  bool _showSources = false;
  Map<String, dynamic>? _answer;
  String? _error;

  @override
  void dispose() {
    _questionController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _askQuestion([String? preset]) async {
    final q = preset ?? _questionController.text.trim();
    if (q.isEmpty || _loading) return;

    setState(() { _loading = true; _error = null; _answer = null; _copied = false; _saved = false; _showSources = false; });
    _questionController.clear();

    // Simulate RAG pipeline delay
    await Future.delayed(const Duration(milliseconds: 1100));

    setState(() {
      _loading = false;
      _answer = {
        'answer': '**Introduction.** ${_capitalize(q)} is a fundamental concept frequently tested in university examinations.\n\n'
            '**Explanation.** The underlying mechanism works by decomposing the problem into well-defined stages. '
            'Each stage has an explicit responsibility, and correctness follows from combining the guarantees of the individual stages.\n\n'
            '**Key points:**\n'
            '- Clearly defined scope and assumptions\n'
            '- Well-understood trade-offs and constraints\n'
            '- Standard technique used across the module\n'
            '- Directly supported by approved study material\n\n'
            '**Summary.** For a $_selectedMarks-mark answer, state the definition, explain the mechanism, and list the salient properties with citations.',
        'word_count': 89,
        'marks': _selectedMarks,
        'question': q,
        'sources': <Map<String, dynamic>>[
          {'tag': 'S1', 'document': 'Unit Notes.pdf', 'location': 'Page 42', 'preview': '"The concept is formally defined as the property that ensures..."'},
          if (_selectedMarks >= 5) {'tag': 'S2', 'document': 'Lecture Slides.pptx', 'location': 'Slide 17', 'preview': '"The mechanism proceeds in stages, each preserving the key invariant..."'},
          if (_selectedMarks >= 10) {'tag': 'S3', 'document': 'Textbook Ch.6.pdf', 'location': 'Page 118', 'preview': '"A worked example illustrates how the guarantee holds..."'},
        ],
        'processing_ms': 600 + (q.length * 7) % 900,
      };
    });

    // Scroll to bottom
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  String _capitalize(String s) => s.isNotEmpty ? '${s[0].toUpperCase()}${s.substring(1)}' : s;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bg,
      drawer: const AppDrawer(),
      appBar: AppBar(
        backgroundColor: AppTheme.panel,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Ask a question', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppTheme.fg)),
            if (_answer != null)
              Text('${_answer!['marks']} marks', style: const TextStyle(fontSize: 11, color: AppTheme.faint)),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AppTheme.brandDim.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: AppTheme.brand.withValues(alpha: 0.3)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.circle, size: 6, color: AppTheme.brandAccent),
                SizedBox(width: 5),
                Text('Grounded', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppTheme.brandAccent)),
              ],
            ),
          ),
        ],
      ),

      body: Column(
        children: [
          // Answer area
          Expanded(child: _buildAnswerArea()),
          // Input area
          _buildInputArea(),
        ],
      ),
    );
  }

  Widget _buildAnswerArea() {
    if (_loading) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(
              width: 28, height: 28,
              child: CircularProgressIndicator(strokeWidth: 2.5, color: AppTheme.brandAccent),
            ),
            const SizedBox(height: 16),
            const Text('Searching approved materials…', style: TextStyle(color: AppTheme.muted, fontSize: 13)),
            const SizedBox(height: 6),
            // Loading dots
            Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(3, (i) => TweenAnimationBuilder<double>(
                tween: Tween(begin: 0.3, end: 1.0),
                duration: Duration(milliseconds: 600 + (i * 200)),
                builder: (ctx, val, child) => Opacity(
                  opacity: val,
                  child: Container(
                    width: 7, height: 7,
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppTheme.brandAccent,
                    ),
                  ),
                ),
              )),
            ),
          ],
        ),
      );
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: AppTheme.statusError),
              const SizedBox(height: 12),
              Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppTheme.statusError)),
              const SizedBox(height: 12),
              OutlinedButton(onPressed: () => setState(() => _error = null), child: const Text('Dismiss')),
            ],
          ),
        ),
      );
    }

    if (_answer != null) {
      final sources = (_answer!['sources'] as List<Map<String, dynamic>>);
      return SingleChildScrollView(
        controller: _scrollController,
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Question bubble — right aligned
            Align(
              alignment: Alignment.centerRight,
              child: Container(
                constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.85),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.panel,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(16),
                    topRight: Radius.circular(16),
                    bottomLeft: Radius.circular(16),
                    bottomRight: Radius.circular(4),
                  ),
                  border: Border.all(color: AppTheme.line),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_answer!['question'], style: const TextStyle(color: AppTheme.fg, fontSize: 14, height: 1.5)),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppTheme.panel2,
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(color: AppTheme.line),
                          ),
                          child: Text('${_answer!['marks']} marks',
                            style: const TextStyle(color: AppTheme.muted, fontSize: 11, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Answer header
            Row(
              children: [
                const AppLogo(size: 28, radius: 8),
                const SizedBox(width: 8),
                const Text('VibeGPT', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppTheme.fg)),
                const SizedBox(width: 8),
                Text('${_answer!['word_count']} words · ${_answer!['processing_ms']}ms',
                  style: const TextStyle(fontSize: 11, color: AppTheme.faint),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Answer card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppTheme.panel,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                  bottomLeft: Radius.circular(4),
                  bottomRight: Radius.circular(16),
                ),
                border: Border.all(color: AppTheme.line),
              ),
              child: _buildFormattedAnswer(_answer!['answer']),
            ),
            const SizedBox(height: 10),

            // Action buttons
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _actionChip(
                  _copied ? Icons.check : Icons.copy,
                  _copied ? 'Copied' : 'Copy',
                  () {
                    final text = (_answer!['answer'] as String).replaceAll(RegExp(r'\*\*'), '');
                    Clipboard.setData(ClipboardData(text: text));
                    setState(() => _copied = true);
                    Future.delayed(const Duration(seconds: 2), () {
                      if (mounted) setState(() => _copied = false);
                    });
                  },
                  active: _copied,
                ),
                _actionChip(
                  _saved ? Icons.bookmark : Icons.bookmark_outline,
                  _saved ? 'Saved' : 'Save',
                  () => setState(() => _saved = !_saved),
                  active: _saved,
                ),
                _actionChip(Icons.refresh, 'Regenerate', () => _askQuestion(_answer!['question'])),
                _actionChip(Icons.auto_fix_high, 'Simplify', () {}),
                _actionChip(
                  Icons.description_outlined,
                  'Sources (${sources.length})',
                  () => setState(() => _showSources = !_showSources),
                  active: _showSources,
                ),
              ],
            ),

            // Sources
            if (_showSources) ...[
              const SizedBox(height: 14),
              const Text('SOURCE REFERENCES',
                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppTheme.faint, letterSpacing: 1),
              ),
              const SizedBox(height: 8),
              ...sources.map((src) => Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.panel,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.line),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.brand.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(src['tag'], style: const TextStyle(
                            fontSize: 10, fontWeight: FontWeight.w700,
                            color: AppTheme.brandAccent,
                            fontFamily: 'monospace',
                          )),
                        ),
                        const SizedBox(width: 8),
                        Expanded(child: Text(src['document'], style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppTheme.fg))),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppTheme.panel2,
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(color: AppTheme.line),
                          ),
                          child: Text(src['location'], style: const TextStyle(fontSize: 10, color: AppTheme.muted)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(src['preview'], style: const TextStyle(fontSize: 12, color: AppTheme.muted, fontStyle: FontStyle.italic)),
                  ],
                ),
              )),
            ],
          ],
        ),
      );
    }

    // Empty state
    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                const AppLogo(size: 64, radius: 18, glow: true),
                const SizedBox(height: 20),
                const Text('What would you like to study?',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppTheme.fg),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Select marks and ask a question from your study materials.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: AppTheme.muted),
                ),
                const SizedBox(height: 24),

                // Suggestion cards
                ...[
                  'Explain ACID properties',
                  'Compare paging vs segmentation',
                  'Difference between TCP and UDP',
                  'Dijkstra\'s algorithm steps',
                ].map((s) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: InkWell(
                    onTap: () => _askQuestion(s),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: AppTheme.panel,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.line),
                      ),
                      child: Text(s, style: const TextStyle(fontSize: 13, color: AppTheme.muted)),
                    ),
                  ),
                )),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFormattedAnswer(String body) {
    final lines = body.split('\n');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: lines.map((line) {
        final trimmed = line.trim();
        if (trimmed.isEmpty) return const SizedBox(height: 6);

        // Bold markers
        final spans = <InlineSpan>[];
        final regex = RegExp(r'\*\*(.+?)\*\*');
        int start = 0;
        for (final match in regex.allMatches(trimmed)) {
          if (match.start > start) {
            spans.add(TextSpan(text: trimmed.substring(start, match.start)));
          }
          spans.add(TextSpan(
            text: match.group(1),
            style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.white),
          ));
          start = match.end;
        }
        if (start < trimmed.length) {
          spans.add(TextSpan(text: trimmed.substring(start)));
        }

        if (trimmed.startsWith('- ')) {
          return Padding(
            padding: const EdgeInsets.only(left: 12, top: 3, bottom: 3),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('•  ', style: TextStyle(color: AppTheme.brandAccent, fontSize: 14)),
                Expanded(
                  child: RichText(
                    text: TextSpan(
                      style: const TextStyle(fontSize: 14, height: 1.65, color: Color(0xFFE4E4E4)),
                      children: spans.map((s) {
                        final ts = s as TextSpan;
                        return TextSpan(text: ts.text?.replaceFirst('- ', '') ?? '', style: ts.style);
                      }).toList(),
                    ),
                  ),
                ),
              ],
            ),
          );
        }

        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 3),
          child: RichText(
            text: TextSpan(
              style: const TextStyle(fontSize: 14, height: 1.65, color: Color(0xFFE4E4E4)),
              children: spans,
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _actionChip(IconData icon, String label, VoidCallback onTap, {bool active = false}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: BoxDecoration(
          color: active ? AppTheme.brand.withValues(alpha: 0.08) : Colors.transparent,
          border: Border.all(
            color: active ? AppTheme.brand.withValues(alpha: 0.4) : AppTheme.line,
          ),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: active ? AppTheme.brandAccent : AppTheme.muted),
            const SizedBox(width: 5),
            Text(label, style: TextStyle(
              fontSize: 12, fontWeight: FontWeight.w500,
              color: active ? AppTheme.brandAccent : AppTheme.muted,
            )),
          ],
        ),
      ),
    );
  }

  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
      decoration: const BoxDecoration(
        color: AppTheme.bg,
        border: Border(top: BorderSide(color: AppTheme.line)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Marks selector
            Row(
              children: [
                const Text('Marks ', style: TextStyle(fontSize: 11, color: AppTheme.faint)),
                const SizedBox(width: 4),
                ...([2, 3, 5, 8, 10].map((m) => Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedMarks = m),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: _selectedMarks == m
                            ? AppTheme.brand.withValues(alpha: 0.14)
                            : AppTheme.panel2,
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(
                          color: _selectedMarks == m ? AppTheme.brand : AppTheme.line,
                        ),
                        boxShadow: _selectedMarks == m ? [
                          BoxShadow(
                            color: AppTheme.brand.withValues(alpha: 0.3),
                            blurRadius: 12,
                            spreadRadius: -4,
                          ),
                        ] : [],
                      ),
                      child: Text('$m',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: _selectedMarks == m ? Colors.white : AppTheme.muted,
                        ),
                      ),
                    ),
                  ),
                ))),
              ],
            ),
            const SizedBox(height: 8),

            // Composer
            Container(
              decoration: BoxDecoration(
                color: AppTheme.panel.withValues(alpha: 0.85),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.line),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _questionController,
                      maxLines: 4,
                      minLines: 1,
                      maxLength: 2000,
                      style: const TextStyle(color: AppTheme.fg, fontSize: 14),
                      decoration: const InputDecoration(
                        hintText: 'Ask a question from your study materials…',
                        hintStyle: TextStyle(color: AppTheme.faint, fontSize: 14),
                        counterText: '',
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        contentPadding: EdgeInsets.fromLTRB(14, 12, 0, 12),
                        fillColor: Colors.transparent,
                        filled: true,
                      ),
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _askQuestion(),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(right: 6, bottom: 6),
                    child: Container(
                      width: 40, height: 40,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(colors: [AppTheme.brand, AppTheme.brandAccent]),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: IconButton(
                        onPressed: _loading ? null : () => _askQuestion(),
                        icon: _loading
                            ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Icon(Icons.arrow_upward, size: 18, color: Colors.white),
                        padding: EdgeInsets.zero,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 6),
            const Text('Answers use only admin-approved materials',
              style: TextStyle(fontSize: 10, color: AppTheme.faint),
            ),
            const SizedBox(height: 4),
          ],
        ),
      ),
    );
  }
}
