from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import SurgeonAssessment, SurgeonInstruction
from app.schemas import (
    SurgeonAssessmentRead,
    SurgeonInstructionRead,
    SurgeonUpdatesRead,
)


def assessment_read(assessment: SurgeonAssessment) -> SurgeonAssessmentRead:
    return SurgeonAssessmentRead(
        id=assessment.id,
        surgeon_id=assessment.surgeon_id,
        surgeon_name=assessment.surgeon.full_name if assessment.surgeon else "Flight Surgeon",
        crew_user_id=assessment.crew_user_id,
        status=assessment.status,
        working_diagnosis=assessment.working_diagnosis,
        findings=assessment.findings,
        plan=assessment.plan,
        follow_up=assessment.follow_up,
        share_with_crew=assessment.share_with_crew,
        created_at=assessment.created_at,
        updated_at=assessment.updated_at,
    )


def instruction_read(instruction: SurgeonInstruction) -> SurgeonInstructionRead:
    return SurgeonInstructionRead(
        id=instruction.id,
        surgeon_id=instruction.surgeon_id,
        surgeon_name=instruction.surgeon.full_name if instruction.surgeon else "Flight Surgeon",
        crew_user_id=instruction.crew_user_id,
        kind=instruction.kind,
        message=instruction.message,
        status=instruction.status,
        created_at=instruction.created_at,
        acknowledged_at=instruction.acknowledged_at,
        completed_at=instruction.completed_at,
    )


def crew_updates(db: Session, crew_user_id: int) -> SurgeonUpdatesRead:
    assessments = db.scalars(
        select(SurgeonAssessment)
        .where(
            SurgeonAssessment.crew_user_id == crew_user_id,
            SurgeonAssessment.share_with_crew.is_(True),
        )
        .order_by(SurgeonAssessment.created_at.desc())
        .limit(10)
    ).all()
    instructions = db.scalars(
        select(SurgeonInstruction)
        .where(SurgeonInstruction.crew_user_id == crew_user_id)
        .order_by(SurgeonInstruction.created_at.desc())
        .limit(10)
    ).all()
    return SurgeonUpdatesRead(
        assessments=[assessment_read(item) for item in assessments],
        instructions=[instruction_read(item) for item in instructions],
        open_instructions=sum(1 for item in instructions if item.status == "open"),
    )
