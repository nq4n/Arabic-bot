import os
import re
import docx

def parse_activities_to_docx():
    directory = 'src/data/semester2Activities'
    files = [
        'paragraphWritingActivity.ts',
        'topicPlanningActivity.ts',
        'summarizationActivity.ts',
        'biographyWritingActivity.ts',
        'bookPresentationActivity.ts',
        'storytellingActivity.ts'
    ]

    doc = docx.Document()
    doc.add_heading('الأنشطة التفاعلية - الفصل الأول', 0)

    for filename in files:
        filepath = os.path.join(directory, filename)
        if not os.path.exists(filepath):
            continue

        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Extract Interactive Activity
        inter_match = re.search(r'export const \w+InteractiveActivity\s*=\s*\{(.*?)\}\s*satisfies', content, re.DOTALL)
        if not inter_match:
            inter_match = re.search(r'export const \w+InteractiveActivity\s*=\s*\{(.*?)\};', content, re.DOTALL)
            
        if inter_match:
            inter_content = inter_match.group(1)
            title_match = re.search(r'title:\s*"(.*?)"', inter_content)
            if title_match:
                doc.add_heading(title_match.group(1), level=1)
                
            instructions = re.search(r'instructions:\s*"(.*?)"', inter_content)
            if instructions:
                doc.add_paragraph('التعليمات: ' + instructions.group(1))
                
            prompt_match = re.search(r'prompt:\s*"(.*?)"', inter_content)
            if prompt_match:
                doc.add_paragraph('المطلوب: ' + prompt_match.group(1))

            # Extract Scenes
            scenes_match = re.search(r'scenes:\s*\[(.*?)\]\s*,', inter_content, re.DOTALL)
            if not scenes_match:
                scenes_match = re.search(r'scenes:\s*\[(.*?)\]\s*\}', inter_content, re.DOTALL)

            if scenes_match:
                scenes_text = scenes_match.group(1)
                scenes = re.findall(r'\{(.*?)\}', scenes_text, re.DOTALL)
                for scene in scenes:
                    s_title = re.search(r'title:\s*"(.*?)"', scene)
                    if s_title:
                        doc.add_heading(s_title.group(1), level=2)
                    
                    s_desc = re.search(r'scene:\s*"(.*?)"', scene)
                    if s_desc:
                        doc.add_paragraph(s_desc.group(1))
                        
                    s_options = re.search(r'options:\s*\[(.*?)\]', scene, re.DOTALL)
                    if s_options:
                        opts = re.findall(r'"(.*?)"', s_options.group(1))
                        for opt in opts:
                            doc.add_paragraph(opt, style='List Bullet')
                            
            # Other interactive activity types (assemble, dialogue, etc.) might have "parts", "roles", etc.
            parts_match = re.search(r'parts:\s*\[(.*?)\]', inter_content, re.DOTALL)
            if parts_match:
                parts = re.findall(r'"(.*?)"', parts_match.group(1))
                for part in parts:
                    doc.add_paragraph(part, style='List Bullet')
                    
            roles_match = re.search(r'roles:\s*\[(.*?)\]', inter_content, re.DOTALL)
            if roles_match:
                roles = re.findall(r'name:\s*"(.*?)".*?description:\s*"(.*?)"', roles_match.group(1), re.DOTALL)
                for r in roles:
                    doc.add_paragraph(f"{r[0]}: {r[1]}", style='List Bullet')
            
            topics_match = re.search(r'topics:\s*\[(.*?)\]', inter_content, re.DOTALL)
            if topics_match:
                doc.add_heading('الموضوعات:', level=2)
                topics = re.findall(r'"(.*?)"', topics_match.group(1))
                for t in topics:
                    doc.add_paragraph(t, style='List Bullet')

        # Extract Activity Content list
        content_match = re.search(r'export const \w+ActivityContent.*?=\s*\[(.*?)\];', content, re.DOTALL)
        if content_match:
            doc.add_heading('الأنشطة الإضافية:', level=2)
            activities_text = content_match.group(1)
            # Find each activity block
            # They are separated by { ... }
            blocks = []
            brace_count = 0
            current_block = ""
            in_string = False
            for char in activities_text:
                if char == '"' and not current_block.endswith('\\'):
                    in_string = not in_string
                if char == '{' and not in_string:
                    if brace_count == 0:
                        current_block = ""
                    brace_count += 1
                current_block += char
                if char == '}' and not in_string:
                    brace_count -= 1
                    if brace_count == 0:
                        blocks.append(current_block)
            
            for block in blocks:
                title = re.search(r'title:\s*"(.*?)"', block)
                if title:
                    doc.add_heading(title.group(1), level=3)
                desc = re.search(r'description:\s*"(.*?)"', block)
                if desc:
                    doc.add_paragraph(desc.group(1))
                obj = re.search(r'objective:\s*"(.*?)"', block)
                if obj:
                    doc.add_paragraph('الهدف: ' + obj.group(1))
                
                # Instructions list
                instr_match = re.search(r'instructions:\s*\[(.*?)\]', block, re.DOTALL)
                if instr_match:
                    doc.add_paragraph('التعليمات:')
                    instrs = re.findall(r'"(.*?)"', instr_match.group(1))
                    for ins in instrs:
                        doc.add_paragraph(ins, style='List Number')
                
                output = re.search(r'output:\s*"(.*?)"', block)
                if output:
                    doc.add_paragraph('المُخرَج: ' + output.group(1))
                    
                example = re.search(r'example:\s*"(.*?)"', block)
                if example:
                    doc.add_paragraph('مثال: ' + example.group(1))

        # Add a separator
        doc.add_paragraph('---')

    # Set right-to-left for all paragraphs
    for p in doc.paragraphs:
        p.alignment = docx.enum.text.WD_ALIGN_PARAGRAPH.RIGHT
        p.style.font.rtl = True
        
    doc.save('Semester1_Activities.docx')
    print('Saved to Semester1_Activities.docx')

if __name__ == '__main__':
    parse_activities_to_docx()
