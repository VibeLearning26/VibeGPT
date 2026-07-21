from unittest.mock import AsyncMock, Mock

import pytest

from app.database.init_db import create_default_semesters
from app.models.academic import Semester


class SemesterResult:
    def __init__(self, semesters):
        self.semesters = semesters

    def scalars(self):
        return self

    def all(self):
        return self.semesters


@pytest.mark.asyncio
async def test_create_default_semesters_adds_s1_through_s8():
    db = AsyncMock()
    db.add = Mock()
    db.execute.return_value = SemesterResult([])

    await create_default_semesters(db)

    created = [call.args[0] for call in db.add.call_args_list]
    assert [semester.number for semester in created] == list(range(1, 9))
    assert [semester.name for semester in created] == [f"S{i}" for i in range(1, 9)]
    assert all(semester.is_active for semester in created)
    db.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_default_semesters_is_idempotent_and_reactivates_standard_rows():
    existing = [Semester(number=i, name=f"S{i}", is_active=False) for i in range(1, 9)]
    for semester in existing:
        semester.archived_at = object()

    db = AsyncMock()
    db.add = Mock()
    db.execute.return_value = SemesterResult(existing)

    await create_default_semesters(db)

    db.add.assert_not_called()
    assert all(semester.is_active for semester in existing)
    assert all(semester.archived_at is None for semester in existing)
    db.flush.assert_awaited_once()
