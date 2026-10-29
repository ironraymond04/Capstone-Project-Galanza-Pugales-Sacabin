# ml_service/add_tesda.py
import pandas as pd

TESDA_ID = 22  # use the real office_id from step 1
texts = [
    "How do I apply for a TESDA scholarship?",
    "Asa ko mag-enroll sa TESDA course?",
    "When is the NC II assessment schedule?",
    "I need my TESDA National Certificate (NC) copy",
    "What TESDA courses are offered this semester?",
    "Pila ang bayad sa TESDA training program?",
    "Is there a TWSP slot available for welding?",
    "My TESDA training allowance has not been released",
    "Can I take the TESDA assessment even if I am not a student here?",
    "Requirements for TESDA enrollment",
    "Do you have TESDA scholarship programs for out-of-school youth?",
    "Do you have Events Management Services NCII course?",
    "Is there a Driving NCII course available this semester?",
]

path = "data/tickets.csv"
df = pd.read_csv(path, encoding="utf-8-sig")
new = pd.DataFrame({"concern_text": texts, "assigned_office": TESDA_ID})
pd.concat([df, new], ignore_index=True).to_csv(path, index=False, encoding="utf-8-sig")