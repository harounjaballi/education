import { getDictionary } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui/page";
import { Form, SubmitButton } from "@/components/ui/form";
import { getLevelOptions, getSchoolOptions } from "../_data";
import { createUser, type ManagedRole } from "./actions";
import { UserFields } from "./user-fields";

export async function UserNew({ role }: { role: ManagedRole }) {
  const { t } = await getDictionary();
  const u = t.admin.users;
  const [schools, levels] = await Promise.all([getSchoolOptions(), getLevelOptions()]);
  const title = role === "teacher" ? u.newTeacher : u.newStudent;

  return (
    <>
      <PageHeader
        title={title}
        back={{ href: `/admin/${role}s`, label: role === "teacher" ? u.teachersTitle : u.studentsTitle }}
      />
      <section className="card max-w-2xl p-5 sm:p-6">
        <Form action={createUser.bind(null, role)}>
          <UserFields role={role} t={u} none={t.common.none} schools={schools} levels={levels} withPassword />
          <div className="flex justify-end">
            <SubmitButton pendingLabel={t.common.saving}>{t.common.create}</SubmitButton>
          </div>
        </Form>
      </section>
    </>
  );
}
