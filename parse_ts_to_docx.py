import re
import docx

def parse_and_create_docx():
    with open('src/data/semester2Topics.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    doc = docx.Document()
    doc.add_heading('محتوى دروس المنصة - الفصل الأول (مصحح)', 0)

    # Simple extraction using regex
    # We will extract each lesson based on "header: "الدرس ...""
    
    # Let's extract blocks for each lesson
    lessons = re.split(r'id:\s*".*?",', content)[1:]
    
    for lesson_block in lessons:
        # Title
        title_match = re.search(r'title:\s*"(.*?)",', lesson_block)
        if title_match:
            doc.add_heading(title_match.group(1), level=1)
            
        # Description
        desc_match = re.search(r'description:\s*"(.*?)",', lesson_block)
        if desc_match:
            doc.add_paragraph(desc_match.group(1))
            
        # Goals
        goals_match = re.search(r'goals:\s*\[(.*?)\]', lesson_block, re.DOTALL)
        if goals_match:
            doc.add_heading('أهداف الدرس', level=2)
            goals = re.findall(r'"(.*?)"', goals_match.group(1))
            for goal in goals:
                doc.add_paragraph(goal, style='List Bullet')
                
        # Introduction
        intro_match = re.search(r'introduction:\s*\{(.*?)\}', lesson_block, re.DOTALL)
        if intro_match:
            doc.add_heading('مقدمة الدرس', level=2)
            tahdid = re.search(r'tahdid:\s*"(.*?)"', intro_match.group(1))
            if tahdid:
                doc.add_paragraph('التعريف: ' + tahdid.group(1))
            importance = re.search(r'importance:\s*"(.*?)"', intro_match.group(1))
            if importance:
                doc.add_paragraph('الأهمية: ' + importance.group(1))
                
        # Steps
        steps_match = re.search(r'steps:\s*\[(.*?)\]\s*,', lesson_block, re.DOTALL)
        if steps_match:
            doc.add_heading('خطوات الدرس', level=2)
            step_blocks = re.findall(r'\{(.*?)\}', steps_match.group(1), re.DOTALL)
            for sb in step_blocks:
                title = re.search(r'title:\s*"(.*?)"', sb)
                desc = re.search(r'description:\s*"(.*?)"', sb)
                if title and desc:
                    p = doc.add_paragraph()
                    p.add_run(title.group(1) + ': ').bold = True
                    p.add_run(desc.group(1))

        # Writing Model
        model_match = re.search(r'writingModel:\s*\{(.*?)\}', lesson_block, re.DOTALL)
        if model_match:
            header = re.search(r'header:\s*"(.*?)"', model_match.group(1))
            content_val = re.search(r'content:\s*`(.*?)`', model_match.group(1), re.DOTALL)
            if header and content_val:
                doc.add_heading(header.group(1), level=2)
                doc.add_paragraph(content_val.group(1).strip())
                
        # Review Questions
        questions_match = re.search(r'reviewQuestions:\s*\[(.*?)\]', lesson_block, re.DOTALL)
        if questions_match:
            doc.add_heading('أسئلة المراجعة', level=2)
            q_blocks = re.findall(r'\{(.*?)\}', questions_match.group(1), re.DOTALL)
            for qb in q_blocks:
                q = re.search(r'question:\s*"(.*?)"', qb)
                a = re.search(r'answer:\s*"(.*?)"', qb)
                if q and a:
                    p = doc.add_paragraph()
                    p.add_run('س: ' + q.group(1) + '\n').bold = True
                    p.add_run('ج: ' + a.group(1))
                    
        # Evaluation Task
        eval_match = re.search(r'evaluationTask:\s*\{(.*?)\}', lesson_block, re.DOTALL)
        if eval_match:
            doc.add_heading('مهمة التقييم', level=2)
            title = re.search(r'title:\s*"(.*?)"', eval_match.group(1))
            desc = re.search(r'description:\s*"(.*?)"', eval_match.group(1))
            if title and desc:
                p = doc.add_paragraph()
                p.add_run(title.group(1) + '\n').bold = True
                p.add_run(desc.group(1))

    # Set right-to-left for all paragraphs
    for p in doc.paragraphs:
        p.alignment = docx.enum.text.WD_ALIGN_PARAGRAPH.RIGHT
        p.style.font.rtl = True
        
    doc.save('Semester1_Lessons_Corrected.docx')
    print('Saved to Semester1_Lessons_Corrected.docx')

if __name__ == '__main__':
    parse_and_create_docx()
